"""
PDF Generator -- Settlement Report
Backend Role 2 | NLU Mediation Platform | Week 4

Generates a ReportLab PDF settlement report and saves it to Supabase Storage.
Called after both parties confirm their settlement.

FIXED:
- FONT: ReportLab's default font (Helvetica) does not include the ₹ (Indian
  Rupee) glyph, so any ₹ symbol in settlement text was rendering as a black
  box (■) in the generated PDF. We register DejaVu Sans instead, which does
  support ₹. We reuse the DejaVuSans.ttf / DejaVuSans-Bold.ttf files that
  ship inside the `matplotlib` package (mpl-data/fonts/ttf/), so the only
  requirement is `pip install matplotlib` -- no new font files to add to
  the repo. _clean_symbols() still normalises a few other characters
  (smart quotes, em-dashes, ellipses) that can render oddly even with a
  full-coverage font, but no longer touches ₹ since DejaVu Sans renders it
  correctly now.
- ACCEPTED PROPOSAL LOOKUP: _get_accepted_proposal() finds the proposal
  BOTH parties actually accepted (via proposal_responses), instead of just
  ordering by round/round_number. This is more robust than relying on any
  single round-tracking column being consistently incremented.
"""

import os
import io
import logging
from datetime import datetime, timezone

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

logger = logging.getLogger(__name__)


# ── Font registration (module-level, runs once on import) ─────────────────────
# We locate DejaVu Sans inside the installed matplotlib package and register
# it with ReportLab under the names "DejaVuSans" and "DejaVuSans-Bold".
# If matplotlib isn't installed, or the font files can't be found for any
# reason, we fall back to Helvetica so PDF generation still works -- it will
# just show ■ for ₹ again, same as before this fix, rather than crashing.

FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

try:
    import matplotlib
    _font_dir = os.path.join(
        os.path.dirname(matplotlib.__file__), "mpl-data", "fonts", "ttf"
    )
    _regular_path = os.path.join(_font_dir, "DejaVuSans.ttf")
    _bold_path = os.path.join(_font_dir, "DejaVuSans-Bold.ttf")

    if os.path.exists(_regular_path) and os.path.exists(_bold_path):
        pdfmetrics.registerFont(TTFont("DejaVuSans", _regular_path))
        pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", _bold_path))
        FONT_REGULAR = "DejaVuSans"
        FONT_BOLD = "DejaVuSans-Bold"
        logger.info("[PDF] Registered DejaVu Sans font (₹ symbol will render correctly)")
    else:
        logger.warning(
            "[PDF] DejaVu Sans font files not found inside matplotlib install -- "
            "falling back to Helvetica. ₹ symbol may render as a black box. "
            "Run: pip install matplotlib"
        )
except ImportError:
    logger.warning(
        "[PDF] matplotlib not installed -- falling back to Helvetica. "
        "₹ symbol may render as a black box. Run: pip install matplotlib"
    )


def _clean_symbols(text: str) -> str:
    """
    Normalise a few characters that can render oddly even with a
    full-coverage font (smart quotes, em/en-dashes, ellipses, bullets,
    non-breaking spaces). ₹ is intentionally NOT included here anymore --
    DejaVu Sans renders it correctly, so replacing it with "Rs." would
    actually be a downgrade now that the font supports the real symbol.
    """
    if not text:
        return text
    replacements = {
        "\u2013": "-",
        "\u2014": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2022": "-",
        "\u00a0": " ",
        "\u2026": "...",
    }
    for symbol, replacement in replacements.items():
        text = text.replace(symbol, replacement)
    return text


def _get_accepted_proposal(supabase, case_id: str):
    """
    Find the specific proposal that BOTH parties accepted.

    WHY this exists:
        Ordering by round alone is not fully reliable if a round-tracking
        column is ever not incremented on revision. Instead, we find the
        proposal that both parties explicitly accepted via
        proposal_responses, which is definitively correct regardless of
        any round-tracking column's state.

    FALLBACK:
        Most recently published proposal (by round desc) if no proposal
        has two accept responses yet.
    """
    all_proposals = supabase.table("proposals").select(
        "id, content, round, published_at, created_at"
    ).eq("case_id", case_id).eq(
        "status", "published"
    ).order("round", desc=True).execute()

    if not all_proposals.data:
        any_proposal = supabase.table("proposals").select(
            "id, content, round, published_at, created_at"
        ).eq("case_id", case_id).order(
            "created_at", desc=True
        ).limit(1).execute()
        return any_proposal.data[0] if any_proposal.data else None

    for proposal in all_proposals.data:
        proposal_id = proposal["id"]

        responses = supabase.table("proposal_responses").select(
            "party_id, decision"
        ).eq("proposal_id", proposal_id).execute()

        if not responses.data:
            continue

        decisions = [r["decision"] for r in responses.data]

        if len(decisions) == 2 and all(d == "accept" for d in decisions):
            logger.info(
                f"[PDF] Found accepted proposal: {proposal_id} "
                f"round={proposal.get('round')}"
            )
            return proposal

    logger.warning(
        f"[PDF] No proposal with two accepts found for case {case_id}. "
        f"Using most recent published proposal as fallback."
    )
    return all_proposals.data[0]


def generate_settlement_pdf(case_id: str) -> str:
    """
    Generate, upload, and return signed URL for the settlement PDF.

    Returns: signed URL string valid for 24 hours.
    Raises: ValueError if required data is missing.
    """
    from supabase import create_client
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_KEY"]
    )

    logger.info(f"[PDF] Starting settlement PDF generation for case {case_id}")

    # ── Step 1: Fetch case details ────────────────────────────────────────────
    case_resp = supabase.table("cases").select(
        "id, dispute_type, brief_description, created_by, created_at"
    ).eq("id", case_id).limit(1).execute()

    if not case_resp.data:
        raise ValueError(f"Case {case_id} not found")

    case_data = case_resp.data[0]
    case_ref = case_id[:8].upper()

    # ── Step 2: Fetch mediator details ────────────────────────────────────────
    mediator_email = "Mediator"
    if case_data.get("created_by"):
        mediator_resp = supabase.table("users").select(
            "email"
        ).eq("id", case_data["created_by"]).limit(1).execute()
        if mediator_resp.data:
            mediator_email = mediator_resp.data[0].get("email", "Mediator")

    # ── Step 3: Fetch both parties' settlement confirmations ──────────────────
    confirmations_resp = supabase.table("settlement_confirmations").select(
        "party_id, typed_name, signature_url, confirmed_at"
    ).eq("case_id", case_id).execute()

    if not confirmations_resp.data or len(confirmations_resp.data) < 2:
        raise ValueError(
            f"Expected 2 settlement confirmations for case {case_id}, "
            f"found {len(confirmations_resp.data or [])}"
        )

    confirmations = confirmations_resp.data

    # ── Step 4: Fetch the ACCEPTED proposal ───────────────────────────────────
    accepted_proposal = _get_accepted_proposal(supabase, case_id)

    proposal_text = "Settlement terms as agreed by both parties."
    round_number = 1

    if accepted_proposal:
        content_text = accepted_proposal.get("content", "")
        proposal_text = _clean_symbols(content_text) if content_text else proposal_text
        round_number = accepted_proposal.get("round") or 1
        logger.info(
            f"[PDF] Using proposal round={round_number} "
            f"id={accepted_proposal.get('id')}"
        )
    else:
        logger.warning(f"[PDF] No proposal found for case {case_id}")

    # ── Step 5: Fetch conflict summary from Burst 1 ───────────────────────────
    analysis_resp = supabase.table("ai_analysis").select(
        "conflict_extraction"
    ).eq("case_id", case_id).eq("burst_number", 1).limit(1).execute()

    conflict = {}
    if analysis_resp.data:
        conflict = analysis_resp.data[0].get("conflict_extraction") or {}

    core_dispute = _clean_symbols(str(
        conflict.get("core_dispute")
        or case_data.get("brief_description")
        or "Dispute details not available."
    ))

    dispute_type = str(
        conflict.get("dispute_type")
        or case_data.get("dispute_type")
        or "General Dispute"
    ).replace("_", " ").title()

    # ── Step 6: Build PDF ─────────────────────────────────────────────────────
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2.5 * cm,
        leftMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontName=FONT_BOLD,
        fontSize=18,
        textColor=colors.HexColor("#1e3a5f"),
        alignment=TA_CENTER,
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=11,
        textColor=colors.HexColor("#4a5568"),
        alignment=TA_CENTER,
        spaceAfter=4,
    )
    section_heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName=FONT_BOLD,
        fontSize=12,
        textColor=colors.HexColor("#1e3a5f"),
        spaceBefore=14,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=10,
        leading=16,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    )
    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=8,
        textColor=colors.HexColor("#718096"),
        alignment=TA_CENTER,
    )

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("SETTLEMENT AGREEMENT", title_style))
    story.append(Paragraph("NLU Shimla AI-Powered Mediation Platform", subtitle_style))
    story.append(Paragraph(f"Case Reference: {case_ref}", subtitle_style))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1e3a5f")))
    story.append(Spacer(1, 0.4 * cm))

    # ── Case Details ──────────────────────────────────────────────────────────
    story.append(Paragraph("CASE DETAILS", section_heading_style))

    case_details_data = [
        ["Case Reference", case_ref],
        ["Dispute Type", dispute_type],
        ["Mediator", mediator_email],
        ["Agreement Round", f"Round {round_number}"],
        ["Generated", datetime.now(timezone.utc).strftime("%d %B %Y, %H:%M UTC")],
    ]

    case_table = Table(case_details_data, colWidths=[5 * cm, 11 * cm])
    case_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), FONT_BOLD),
        ("FONTNAME", (1, 0), (1, -1), FONT_REGULAR),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#4a5568")),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1),
         [colors.HexColor("#f7fafc"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(case_table)
    story.append(Spacer(1, 0.3 * cm))

    # ── Dispute Summary ───────────────────────────────────────────────────────
    story.append(Paragraph("DISPUTE SUMMARY", section_heading_style))
    story.append(Paragraph(core_dispute, body_style))

    # ── Settlement Terms ──────────────────────────────────────────────────────
    story.append(Paragraph("AGREED SETTLEMENT TERMS", section_heading_style))
    story.append(HRFlowable(
        width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")
    ))
    story.append(Spacer(1, 0.2 * cm))

    for para in str(proposal_text).split("\n"):
        para = _clean_symbols(para.strip())
        if para:
            story.append(Paragraph(para, body_style))

    story.append(Spacer(1, 0.3 * cm))

    # ── Party Confirmations ───────────────────────────────────────────────────
    story.append(Paragraph("PARTY CONFIRMATIONS", section_heading_style))
    story.append(Paragraph(
        "Both parties have confirmed their agreement to the above settlement terms "
        "by providing their full legal name and digital signature.",
        body_style
    ))
    story.append(Spacer(1, 0.3 * cm))

    for i, confirmation in enumerate(confirmations):
        party_label = f"Party {i + 1}"
        confirmed_at = confirmation.get("confirmed_at") or ""
        if confirmed_at:
            try:
                dt_obj = datetime.fromisoformat(
                    str(confirmed_at).replace("Z", "+00:00")
                )
                confirmed_at = dt_obj.strftime("%d %B %Y, %H:%M UTC")
            except Exception:
                confirmed_at = str(confirmed_at)

        conf_data = [
            [f"{party_label} -- Full Name",
             str(confirmation.get("typed_name") or "")],
            ["Confirmed At", confirmed_at],
        ]

        conf_table = Table(conf_data, colWidths=[5 * cm, 11 * cm])
        conf_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (0, -1), FONT_BOLD),
            ("FONTNAME", (1, 0), (1, -1), FONT_REGULAR),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#4a5568")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fff4")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c6f6d5")),
            ("PADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(conf_table)
        story.append(Spacer(1, 0.2 * cm))

    # ── Legal Footer ──────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(
        width="100%", thickness=1, color=colors.HexColor("#e2e8f0")
    ))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        "This settlement agreement has been reached through mediation conducted under the "
        "Mediation Act, 2023. The parties have voluntarily agreed to the above terms. "
        "This document serves as a record of the mediated settlement.",
        footer_style
    ))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        f"Generated by NLU Shimla AI-Powered Mediation Platform - "
        f"{datetime.now(timezone.utc).strftime('%d %B %Y')}",
        footer_style
    ))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    logger.info(f"[PDF] Built successfully for case {case_id}, size={len(pdf_bytes)} bytes")

    # ── Step 7: Upload to Supabase Storage ────────────────────────────────────
    storage_path = f"{case_id}/settlement.pdf"

    supabase.storage.from_("case-documents").upload(
        path=storage_path,
        file=pdf_bytes,
        file_options={"content-type": "application/pdf", "upsert": "true"}
    )

    logger.info(f"[PDF] Uploaded to storage: case-documents/{storage_path}")

    # ── Step 8: Save URL to mediation_reports ─────────────────────────────────
    supabase.table("mediation_reports").insert({
        "case_id": case_id,
        "pdf_url": storage_path,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    # ── Step 9: Return signed URL (valid 24 hours) ────────────────────────────
    signed_resp = supabase.storage.from_("case-documents").create_signed_url(
        storage_path, 86400
    )

    signed_url = (
        signed_resp.get("signedURL")
        or signed_resp.get("signed_url")
        or ""
    )

    logger.info(f"[PDF] Settlement PDF complete for case {case_id}")
    return signed_url