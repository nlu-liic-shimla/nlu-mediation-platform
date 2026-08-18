"""
PDF Generator -- Settlement Report
Backend Role 2 | NLU Mediation Platform | Week 4

Generates a ReportLab PDF settlement report and saves it to
Supabase Storage. Called after both parties confirm their settlement.

FIXED:
- _clean_symbols() replaces rupee symbol and special chars before PDF rendering
- _get_accepted_proposal() finds the proposal BOTH parties actually accepted
  instead of just highest round_number (which failed when round_number
  was not incremented on revision -- both proposals had round_number=1)
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

logger = logging.getLogger(__name__)


def _clean_symbols(text: str) -> str:
    """
    Replace symbols that ReportLab default Helvetica font cannot render.
    The rupee sign (U+20B9) and smart quotes appear as black boxes without this.
    Called on all text before it enters the PDF story.
    """
    if not text:
        return text
    replacements = {
        "\u20b9": "Rs.",
        "₹":      "Rs.",
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
        The naive .order("round_number", desc=True) query fails when
        revised proposals are saved without incrementing round_number.
        Both the original and the revised end up with round_number=1
        so the query returns the original (first inserted) -- wrong terms in PDF.

    FIX:
        Find the proposal where proposal_responses has two rows
        both with decision='accept'. That is definitively the settled proposal.

    FALLBACK:
        Most recently created published proposal if no clear winner found.
    """
    all_proposals = supabase.table("proposals").select(
        "id, raw_text, round_number, published_at, created_at"
    ).eq("case_id", case_id).eq(
        "is_published", True
    ).order("created_at", desc=True).execute()

    if not all_proposals.data:
        any_proposal = supabase.table("proposals").select(
            "id, raw_text, round_number, published_at, created_at"
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
                f"round={proposal.get('round_number')}"
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
        raw_text = accepted_proposal.get("raw_text", "")
        proposal_text = _clean_symbols(raw_text) if raw_text else proposal_text
        round_number = accepted_proposal.get("round_number") or 1
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
        fontSize=18,
        textColor=colors.HexColor("#1e3a5f"),
        alignment=TA_CENTER,
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=11,
        textColor=colors.HexColor("#4a5568"),
        alignment=TA_CENTER,
        spaceAfter=4,
    )
    section_heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=12,
        textColor=colors.HexColor("#1e3a5f"),
        spaceBefore=14,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10,
        leading=16,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    )
    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
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
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
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
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
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