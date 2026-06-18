"""
PDF Generator — Settlement Report
Backend Role 2 | NLU Mediation Platform | Week 4

Generates a ReportLab PDF settlement report and saves it to Supabase Storage.
Called after both parties confirm their settlement.
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
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

logger = logging.getLogger(__name__)


def generate_settlement_pdf(case_id: str) -> str:
    from supabase import create_client
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_KEY"]
    )

    logger.info(f"[PDF] Starting settlement PDF generation for case {case_id}")

    # ── Step 1: Fetch case details ────────────────────────────────────────────
    case_resp = supabase.table("cases") \
        .select("id, dispute_type, brief_description, created_by, created_at") \
        .eq("id", case_id) \
        .limit(1) \
        .execute()

    if not case_resp.data:
        raise ValueError(f"Case {case_id} not found")

    case_data = case_resp.data[0]
    case_ref = case_id[:8].upper()

    # ── Step 2: Fetch mediator details ────────────────────────────────────────
    mediator_email = "Mediator"
    if case_data.get("created_by"):
        mediator_resp = supabase.table("users") \
            .select("email") \
            .eq("id", case_data["created_by"]) \
            .limit(1) \
            .execute()
        if mediator_resp.data:
            mediator_email = mediator_resp.data[0].get("email", "Mediator")

    # ── Step 3: Fetch both parties' settlement confirmations ──────────────────
    confirmations_resp = supabase.table("settlement_confirmations") \
        .select("party_id, typed_name, signature_url, confirmed_at") \
        .eq("case_id", case_id) \
        .execute()

    if not confirmations_resp.data or len(confirmations_resp.data) < 2:
        raise ValueError(
            f"Expected 2 settlement confirmations for case {case_id}, "
            f"found {len(confirmations_resp.data or [])}"
        )

    confirmations = confirmations_resp.data

    # ── Step 4: Fetch accepted proposal ──────────────────────────────────────
    proposal_resp = supabase.table("proposals") \
        .select("raw_text, round_number, published_at") \
        .eq("case_id", case_id) \
        .eq("is_published", True) \
        .order("round_number", desc=True) \
        .limit(1) \
        .execute()

    proposal_text = "Settlement terms as agreed by both parties."
    round_number = 1
    if proposal_resp.data:
        proposal_text = proposal_resp.data[0].get("raw_text") or proposal_text
        round_number = proposal_resp.data[0].get("round_number") or 1

    # ── Step 5: Fetch conflict summary from Burst 1 ───────────────────────────
    analysis_resp = supabase.table("ai_analysis") \
        .select("conflict_extraction") \
        .eq("case_id", case_id) \
        .eq("burst_number", 1) \
        .limit(1) \
        .execute()

    conflict = {}
    if analysis_resp.data and len(analysis_resp.data) > 0:
        conflict = analysis_resp.data[0].get("conflict_extraction") or {}

    core_dispute = (
        conflict.get("core_dispute")
        or case_data.get("brief_description")
        or "Dispute details not available."
    )
    dispute_type = (
        conflict.get("dispute_type")
        or case_data.get("dispute_type")
        or "General Dispute"
    )

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
        ["Dispute Type", dispute_type.replace("_", " ").title()],
        ["Mediator", mediator_email],
        ["Agreement Round", f"Round {round_number}"],
        ["Generated", datetime.now(timezone.utc).strftime("%d %B %Y, %H:%M UTC")],
    ]

    case_table = Table(case_details_data, colWidths=[5 * cm, 11 * cm])
    case_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#4a5568")),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#f7fafc"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(case_table)
    story.append(Spacer(1, 0.3 * cm))

    # ── Dispute Summary ───────────────────────────────────────────────────────
    story.append(Paragraph("DISPUTE SUMMARY", section_heading_style))
    story.append(Paragraph(str(core_dispute), body_style))

    # ── Settlement Terms ──────────────────────────────────────────────────────
    story.append(Paragraph("AGREED SETTLEMENT TERMS", section_heading_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 0.2 * cm))

    for para in str(proposal_text).split("\n"):
        para = para.strip()
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
                dt = datetime.fromisoformat(str(confirmed_at).replace("Z", "+00:00"))
                confirmed_at = dt.strftime("%d %B %Y, %H:%M UTC")
            except Exception:
                confirmed_at = str(confirmed_at)

        conf_data = [
            [f"{party_label} — Full Name", str(confirmation.get("typed_name") or "")],
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
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        "This settlement agreement has been reached through mediation conducted under the "
        "Mediation Act, 2023. The parties have voluntarily agreed to the above terms. "
        "This document serves as a record of the mediated settlement.",
        footer_style
    ))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        f"Generated by NLU Shimla AI-Powered Mediation Platform • {datetime.now(timezone.utc).strftime('%d %B %Y')}",
        footer_style
    ))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    logger.info(f"[PDF] PDF built successfully for case {case_id}, size={len(pdf_bytes)} bytes")

    # ── Step 7: Upload to Supabase Storage ───────────────────────────────────
    storage_path = f"{case_id}/settlement.pdf"

    supabase.storage.from_("case-documents").upload(
        path=storage_path,
        file=pdf_bytes,
        file_options={"content-type": "application/pdf", "upsert": "true"}
    )

    logger.info(f"[PDF] Uploaded to storage: case-documents/{storage_path}")

    # ── Step 8: Save URL to mediation_reports ────────────────────────────────
    supabase.table("mediation_reports").insert({
        "case_id": case_id,
        "pdf_url": storage_path,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    # ── Step 9: Return signed URL (valid 24 hours) ───────────────────────────
    signed_resp = supabase.storage.from_("case-documents").create_signed_url(
        storage_path,
        86400
    )

    signed_url = (
        signed_resp.get("signedURL")
        or signed_resp.get("signed_url")
        or ""
    )

    logger.info(f"[PDF] Settlement PDF complete for case {case_id}")
    return signed_url