"""
proposal_draft.py
AI Proposal Draft Generation
Owner: Vaidant
Week 4

Generates an initial proposal draft for the mediator to edit.
Called when mediator clicks 'Create Proposal' button.

Input:
  conflict       -- ConflictExtraction from Burst 1
  batna_watna    -- BatnaWatnaOutput from Burst 2
  mediator_notes -- optional private notes from mediator
  round_number   -- which round this proposal is for (default 1)

Output: str -- plain text proposal draft

The mediator ALWAYS edits this before publishing.
AI draft is a starting point -- not a final proposal.
"""

from dotenv import load_dotenv
load_dotenv()

from typing import Optional
from ai.schemas import ConflictExtraction, BatnaWatnaOutput
from ai.utils.ai_client import call_large_text, is_failed


def _clean_symbols(text: str) -> str:
    """
    Replace symbols that do not render correctly in ReportLab PDF
    or display as black boxes on some systems.
    Called on all AI output before returning.
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
You are an expert legal mediator drafting a settlement proposal
for two parties in a dispute in India under the Mediation Act 2023.

Your draft will be shown to the mediator for editing before any party sees it.
Write a professional, balanced proposal that both parties could reasonably accept.

STRUCTURE YOUR PROPOSAL AS:
1. Header: SETTLEMENT PROPOSAL -- Round {round_number} (use the round number from user message)
2. Brief dispute context (2-3 sentences, neutral)
3. Proposed settlement terms (numbered list -- specific and actionable)
4. Payment/delivery timeline if monetary
5. Confidentiality clause
6. Full and final settlement clause

CRITICAL RULES:
1. Never mention BATNA or WATNA scores -- labels only if relevant
2. Every term must be specific -- no vague language
3. Settlement amount must be realistic -- within the zone of possible agreement
4. Both parties must be referred to as Party A and Party B
5. Include specific timelines for every action item
6. Keep total length between 300-500 words
7. This is a DRAFT -- the mediator will edit it
8. For currency always write Rs. followed by the number
   Example: Rs. 50,000 -- never use the rupee symbol
9. Use only plain ASCII characters -- no special symbols, no fancy quotes
10. Use straight hyphens - not dashes

Return ONLY the proposal text. No JSON. No headings outside the proposal. No explanation.
"""


def generate_proposal_draft(
    conflict: ConflictExtraction,
    batna_watna: BatnaWatnaOutput,
    mediator_notes: Optional[str] = None,
    round_number: int = 1
) -> str:
    """
    Generate an initial proposal draft for the mediator.

    Returns plain text proposal draft string on success.
    Returns fallback template string if AI call fails.
    Never raises -- always returns a usable string.
    """

    # Build BATNA context -- labels only, never scores
    batna_context = f"""
Negotiation positions (for context only -- do not mention in proposal):
Party A: BATNA is {batna_watna.party_a.batna_label}, WATNA is {batna_watna.party_a.watna_label}
Party B: BATNA is {batna_watna.party_b.batna_label}, WATNA is {batna_watna.party_b.watna_label}
Realistic settlement zone: {batna_watna.overall_settlement_zone or 'Not specified'}
"""

    notes_context = ""
    if mediator_notes:
        notes_context = f"\nMediator private notes (use as guidance):\n{mediator_notes}\n"

    monetary_str = (
        f"Rs. {conflict.monetary_value:,.0f}"
        if conflict.monetary_value
        else "Not specified"
    )

    user_message = f"""
This is Round {round_number} of negotiation.
The proposal header must say exactly: SETTLEMENT PROPOSAL -- Round {round_number}
Do NOT use the word "Revised" anywhere in the proposal.
Do NOT write "Revised Settlement Proposal" or any variation.

Generate a settlement proposal draft for this dispute:

DISPUTE TYPE: {conflict.dispute_type.value}
CORE DISPUTE: {conflict.core_dispute}

PARTY A CLAIMS:
{chr(10).join(f'- {claim}' for claim in conflict.claims_party_a)}

PARTY B CLAIMS:
{chr(10).join(f'- {claim}' for claim in conflict.claims_party_b)}

UNDISPUTED FACTS:
{chr(10).join(f'- {fact}' for fact in conflict.undisputed_facts) if conflict.undisputed_facts else '- None identified'}

MONETARY VALUE: {monetary_str}

{batna_context}
{notes_context}

Draft a fair settlement proposal the mediator can edit and publish.
Use Rs. for all currency amounts. Use only plain text characters.
"""

    result = call_large_text(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message
    )

    # Handle plain text response
    if isinstance(result, str) and len(result) > 50:
        return _clean_symbols(result)

    if is_failed(result):
        print(f"  WARNING: Proposal draft generation failed -- returning template")
        print(f"     Reason: {result.get('reason', 'Unknown error')}")
        return _clean_symbols(_fallback_template(conflict, round_number))

    if hasattr(result, 'content'):
        return _clean_symbols(result.content)

    return _clean_symbols(_fallback_template(conflict, round_number))


def _fallback_template(conflict: ConflictExtraction, round_number: int = 1) -> str:
    """
    Fallback template used when AI call fails.
    Gives mediator a starting point to edit manually.
    """
    dispute_type_str = conflict.dispute_type.value.replace('_', ' ')
    return f"""SETTLEMENT PROPOSAL -- Round {round_number}

This proposal relates to a {dispute_type_str} dispute.

{conflict.core_dispute}

PROPOSED TERMS:

1. [MEDIATOR: Insert specific settlement term here]

2. [MEDIATOR: Insert timeline for any payments or actions]

3. Both parties agree that this settlement is in full and final
   settlement of all claims arising from this dispute.

4. This settlement shall remain confidential between the parties
   and the mediator.

[MEDIATOR: Please review and edit all terms before publishing]"""


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

    print("\n" + "="*50)
    print("TEST -- Round 1 Proposal")
    print("="*50)
    draft = generate_proposal_draft(
        conflict=conflict,
        batna_watna=batna_watna,
        mediator_notes="Party A has strong photographic evidence. Realistic settlement around Rs. 30,000-35,000.",
        round_number=1
    )
    print(f"\nDRAFT:\n{draft}")

    print("\n" + "="*50)
    print("TEST -- Round 2 Proposal")
    print("="*50)
    draft2 = generate_proposal_draft(
        conflict=conflict,
        batna_watna=batna_watna,
        round_number=2
    )
    print(f"\nDRAFT:\n{draft2}")