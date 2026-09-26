"""
subsystem_h.py
Sub-system H -- Proposal Revision
Owner: Vaidant
Week 4

Input:
  proposal_raw_text                 -- the rejected proposal text
  requesting_party_rejection_reason -- why requesting party rejected (or None)
  against_party_rejection_reason    -- why against party rejected (or None)
  batna_watna                       -- BatnaWatnaOutput from Burst 2
  round_number                      -- current negotiation round (1, 2, or 3)
  mediator_notes                    -- optional private mediator notes

Output: dict with keys:
  revised_draft    -- str: full revised proposal text
  changes_summary  -- list[str]: specific changes made and why
  reasoning        -- str: overall revision reasoning

Uses large model -- proposal revision is high stakes.
Never mentions numeric BATNA/WATNA scores in output.
"""

from dotenv import load_dotenv
load_dotenv()

from typing import Optional
from ai.schemas import BatnaWatnaOutput
from ai.utils.ai_client import call_large_json, is_failed


def _clean_symbols(text: str) -> str:
    """
    Replace symbols that do not render correctly in ReportLab PDF.
    Called on revised_draft before returning.
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


SYSTEM_PROMPT = """
You are an expert legal mediator helping revise a settlement proposal
after it has been rejected by one or both parties.

Your job is to:
1. Understand exactly WHY the parties rejected the proposal
2. Suggest specific term adjustments that address each rejection reason
3. Keep the revised proposal within realistic settlement bounds
4. Never re-introduce terms that were already rejected
5. Make the proposal more likely to be accepted by both parties

CRITICAL RULES:
1. Never mention BATNA or WATNA scores -- use only labels (Strong/Moderate/Weak)
2. Never suggest terms outside what both parties can realistically accept
3. Every change must be justified by a specific rejection reason
4. If only one party rejected -- focus on their reasons without disadvantaging the other
5. Keep legal language neutral and professional
6. The revised draft must be complete -- not just a summary of changes
7. For currency always write Rs. followed by the number -- never use rupee symbol
8. Use only plain ASCII characters -- no special symbols or fancy quotes
9. Use straight hyphens - not dashes
10. The proposal header must use the new round number provided in the user message
    Example: SETTLEMENT PROPOSAL -- Round 2
11. NEVER use the word "Revised" anywhere in the proposal header or body
    The round number communicates that this is a new version

Return ONLY valid JSON in this EXACT format:
{
    "revised_draft": "complete revised proposal text here -- full proposal not just changes",
    "changes_summary": [
        "Changed X because Party A rejected the original amount as too low",
        "Removed clause Y because both parties objected to the timeline",
        "Added clause Z to address Party B concern about payment schedule"
    ],
    "reasoning": "one paragraph explaining the overall revision strategy"
}

changes_summary must be a list of specific strings -- minimum 2 items.
revised_draft must be a complete proposal -- not a diff or summary.
Return ONLY JSON. No explanation. No markdown.
"""


def generate_proposal_revision(
    proposal_raw_text: str,
    requesting_party_rejection_reason: Optional[str],
    against_party_rejection_reason: Optional[str],
    batna_watna: BatnaWatnaOutput,
    round_number: int,
    mediator_notes: Optional[str] = None
) -> dict:
    """
    Generate a revised proposal after rejection.

    round_number is the CURRENT round that was rejected.
    The revised draft will be for round_number + 1.

    Returns dict with keys:
      revised_draft    -- complete revised proposal text
      changes_summary  -- list of specific changes made
      reasoning        -- overall revision strategy

    Returns failure dict on error -- always check is_failed().
    """

    # The new round number for the revised proposal
    new_round = round_number + 1

    # Build rejection context
    rejection_context = ""
    if requesting_party_rejection_reason:
        rejection_context += (
            f"\nREQUESTING PARTY REJECTION REASON:\n"
            f"{requesting_party_rejection_reason}\n"
        )
    else:
        rejection_context += "\nREQUESTING PARTY: Accepted the proposal.\n"

    if against_party_rejection_reason:
        rejection_context += (
            f"\nAGAINST PARTY REJECTION REASON:\n"
            f"{against_party_rejection_reason}\n"
        )
    else:
        rejection_context += "\nAGAINST PARTY: Accepted the proposal.\n"

    # Build BATNA/WATNA context -- labels only, never scores
    batna_context = f"""
NEGOTIATION POSITIONS (labels only -- do not mention scores):
Requesting Party: BATNA is {batna_watna.party_a.batna_label}, WATNA is {batna_watna.party_a.watna_label}
Against Party:    BATNA is {batna_watna.party_b.batna_label}, WATNA is {batna_watna.party_b.watna_label}
Settlement zone:  {batna_watna.overall_settlement_zone or 'Not specified'}
"""

    notes_context = ""
    if mediator_notes:
        notes_context = f"\nMEDIATOR PRIVATE NOTES:\n{mediator_notes}\n"

    user_message = f"""
This is Round {round_number} of negotiation. The previous proposal was rejected.
Generate a revised proposal for Round {new_round}.

CRITICAL HEADER RULE:
The revised_draft header must say exactly:
SETTLEMENT PROPOSAL -- Round {new_round}
Do NOT use the word "Revised" anywhere in the proposal text.
Do NOT write "Revised Settlement Proposal" or any variation.
The round number tells parties where they are in the process.

ORIGINAL PROPOSAL (Round {round_number}):
{proposal_raw_text}

REJECTION REASONS:
{rejection_context}

{batna_context}
{notes_context}

Generate a revised proposal for Round {new_round} that addresses the rejection reasons
while staying within realistic settlement bounds for both parties.
Use Rs. for all currency amounts. Use only plain text characters.
"""

    result = call_large_json(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message
    )

    # Handle plain dict response
    if isinstance(result, dict) and not result.get("failed"):
        # Clean symbols from revised_draft before returning
        if result.get("revised_draft"):
            result["revised_draft"] = _clean_symbols(result["revised_draft"])
        return result

    if is_failed(result):
        return {
            "failed": True,
            "reason": result.get("reason", "Unknown error"),
            "revised_draft": proposal_raw_text,
            "changes_summary": ["AI revision failed -- original proposal returned"],
            "reasoning": "Revision could not be generated. Mediator should revise manually."
        }

    return result


# -- Public alias -------------------------------------------------------------
def run_subsystem_h(
    proposal_raw_text: str,
    requesting_party_rejection_reason: Optional[str],
    against_party_rejection_reason: Optional[str],
    batna_watna: BatnaWatnaOutput,
    round_number: int,
    mediator_notes: Optional[str] = None
) -> dict:
    """
    Public entry point used by tests and external callers.
    Alias for generate_proposal_revision.
    """
    return generate_proposal_revision(
        proposal_raw_text,
        requesting_party_rejection_reason,
        against_party_rejection_reason,
        batna_watna,
        round_number,
        mediator_notes
    )


# -- Quick test ---------------------------------------------------------------
if __name__ == "__main__":
    from ai.subsystems.subsystem_a import extract_conflict
    from ai.subsystems.subsystem_d import generate_batna_watna

    party_a = """
    I vacated the flat on October 1 2025 after giving 30 days notice.
    The flat was clean and in good condition. I have photos from move-out day.
    The landlord has not returned my security deposit of 50000 INR despite
    three written requests. It has been 3 months.
    """
    party_b = """
    The tenant left on October 3 two days after the agreed date without
    informing me. The flat was damaged with wall marks, a broken ceiling fan
    and cracked bathroom tiles. Repairs cost 45000 INR and I have invoices.
    The deposit was 50000 INR and I am deducting repair costs.
    """

    print("Setting up test data...")
    conflict = extract_conflict(party_a, party_b)
    batna_watna = generate_batna_watna(conflict)

    original_proposal = """SETTLEMENT PROPOSAL -- Round 1

The parties agree to the following terms:

1. Party B (landlord) shall return Rs. 20,000 to Party A (tenant)
   within 14 days of signing this agreement.

2. Party A acknowledges that some repair costs were incurred
   and accepts a deduction of Rs. 30,000 from the original deposit.

3. Both parties agree that this settlement is in full and final
   settlement of all claims arising from this tenancy.

4. Party A shall provide all move-out photographs to Party B
   within 7 days."""

    print("\n" + "="*50)
    print("TEST -- Proposal Revision Round 1 rejected, generating Round 2")
    print("="*50)

    result = generate_proposal_revision(
        proposal_raw_text=original_proposal,
        requesting_party_rejection_reason=(
            "The amount of Rs. 20,000 is too low. "
            "I want at least Rs. 35,000 returned as the flat was in good condition."
        ),
        against_party_rejection_reason=None,
        batna_watna=batna_watna,
        round_number=1,
        mediator_notes="Party A has strong photographic evidence. Consider increasing return amount."
    )

    if is_failed(result):
        print(f"FAILED: {result}")
    else:
        print("\nRevision generated successfully")
        print(f"\nCHANGES SUMMARY:")
        for change in result.get("changes_summary", []):
            print(f"  - {change}")
        print(f"\nREASONING:\n{result.get('reasoning')}")
        print(f"\nREVISED DRAFT:\n{result.get('revised_draft')}")