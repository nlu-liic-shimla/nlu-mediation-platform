"""
subsystem_a.py
Sub-system A — Conflict Extraction
Week 2

Input:  two party statements (already cleaned by Sub-system E)
Output: ConflictExtraction Pydantic model

CRITICAL — entire pipeline depends on this output.
If this fails, pipeline stops. No graceful degradation.

Uses large model — deep legal reasoning required.
"""

from dotenv import load_dotenv
load_dotenv()

from ai.schemas import ConflictExtraction, DisputeType
from ai.utils.ai_client import call_with_retry, is_failed


# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """
You are a senior Indian legal mediator with expertise in dispute resolution
under India's Mediation Act 2023.

Your task: extract a structured conflict summary from two party statements.

═══════════════════════════════════════════════════════════════════
DISPUTE TYPE DEFINITIONS
═══════════════════════════════════════════════════════════════════

Classify the dispute into EXACTLY ONE of these categories:

1. landlord_tenant
   Disputes arising from a tenancy or rental agreement.
   Includes: unpaid rent, security deposit, eviction,
   property damage, maintenance obligations, lease violation.
   Key: a formal or informal tenancy relationship exists.

2. employment
   Disputes between employer and employee.
   Includes: wrongful termination, unpaid wages/salary,
   notice period, severance, workplace harassment,
   non-compete clauses, employment contract terms.
   Key: an employer-employee relationship exists.

3. commercial_contract
   Disputes between two parties (individuals or companies)
   over a commercial agreement for goods or services —
   where the parties do NOT have a personal/family relationship.
   Includes: service agreements, supply contracts, payment
   for deliverables, SLAs, partnership agreements between
   strangers or formal business entities.
   Key: a formal contract exists AND parties are not
   personal partners, family, or neighbours in a space dispute.

4. neighbour_dispute
   Disputes between people who live or own property
   ADJACENT to each other, where the CORE issue is
   about shared physical space or resources.
   Includes: land boundaries, encroachment, walls, fences,
   overhanging trees, shared driveways, water drainage,
   noise between residents, parking in shared areas,
   common area access between residential neighbours.
   Key: parties are neighbours AND core dispute = shared space.
   Note: noise and parking disputes between neighbours qualify
   but set extraction_confidence lower (0.6-0.7) as these
   are less documentable than boundary disputes.

5. family_business
   Disputes between people who personally knew each other
   AND jointly ran or owned a business together.
   Includes: profit-sharing disputes between partners,
   business asset division between co-founders,
   disputes between family members over a jointly run
   enterprise, disagreements between people who pooled
   resources to start or run a venture together.
   Key question: did BOTH parties share in profits AND losses?
   If yes, AND the disputed subject matter is the business
   itself (profits, assets, ownership, dissolution) →
   family_business, regardless of any formal contract.

6. construction
   Disputes involving construction, renovation, or
   civil works contracts — typically between a property
   owner and a contractor/builder.
   Includes: construction defects, incomplete work,
   cost overruns, payment disputes for building work,
   contractor abandoning a project, material quality.
   Key: a construction or renovation contract exists.

7. consumer
   Disputes between an individual consumer and a
   business or service provider over a product or service.
   Includes: defective product, poor service, misleading
   advertising, refund disputes, warranty claims.
   Key: one party is a consumer (individual buying for
   personal use) and the other is a business/provider.

8. debt_recovery
   Disputes where one party explicitly LENT MONEY
   to another, and the borrower has not repaid.
   Includes: personal loans, informal lending between
   friends/family, loan with interest, partial repayment.
   Key: an explicit loan transaction exists.
   NOT debt_recovery: money owed for services, unpaid rent,
   outstanding invoices — those are commercial_contract
   or landlord_tenant.

9. other
   Use when the dispute does not clearly fit any
   of the above categories, or when statements are
   too vague or contradictory to classify confidently.
   When in doubt — use other. Never guess between two categories.

═══════════════════════════════════════════════════════════════════
PRECEDENCE RULES — APPLY IN ORDER WHEN MULTIPLE CATEGORIES FIT
═══════════════════════════════════════════════════════════════════

When a dispute could belong to more than one category,
use this precedence order (higher number = lower priority).
Precedence is decided by the DISPUTED SUBJECT MATTER
(what the disagreement is actually about), not merely by
which relationships happen to exist between the parties.
Two people can be partners AND neighbours AND anything else —
that alone does not decide the category. Ask: what is this
specific dispute actually about?

PRIORITY 1 — family_business
  Applies when the parties are business partners, co-founders,
  or family members who jointly ran a business, AND the
  disputed subject matter is the business itself — profits,
  losses, capital contributions, business assets, ownership
  share, or dissolution of the partnership.
  → family_business, regardless of any formal contract.
  This includes disputes where the same two people are
  also neighbours, contractors, etc., as long as the
  business/partnership issue is what they are disputing.
  Do NOT use family_business just because the parties are
  partners or family — the dispute itself must be ABOUT
  the shared business. If the same two people have a
  separate, unrelated dispute (e.g. a personal residential
  boundary issue), classify that dispute on its own facts
  using the lower-priority categories below.

PRIORITY 2 — landlord_tenant
  If a formal or informal tenancy/rental relationship exists
  AND the dispute concerns that tenancy (rent, deposit,
  eviction, damage, lease terms):
  → landlord_tenant, even if parties are also neighbours.
  Example: landlord living next door to their tenant,
  disputing a shared driveway that is part of the rented
  property's access → landlord_tenant.

PRIORITY 3 — construction
  If a construction or renovation contract is the source
  of the dispute, even between neighbours:
  → construction.
  Example: neighbour hired neighbour to build a wall,
  now disputes workmanship → construction, NOT neighbour_dispute.
  Reason: the contract relationship governs, not proximity.

PRIORITY 4 — commercial_contract
  If a formal service or goods contract governs the dispute,
  between parties who are NOT personal partners or family,
  and the dispute is about that contract (not a business
  they jointly own):
  → commercial_contract.
  Example: neighbour hired neighbour's business to supply
  materials → commercial_contract.

PRIORITY 5 — employment
  If an employer-employee relationship governs.

PRIORITY 6 — debt_recovery
  Only if an explicit loan exists.
  "He owes me money" alone is NOT debt_recovery.
  Must be a clear lending transaction.

PRIORITY 7 — neighbour_dispute
  Apply ONLY when:
  - parties are confirmed neighbours (adjacent property)
  - the CORE dispute is about shared physical space or resources
  - NO higher-priority relationship governs THIS dispute (no
    tenancy over the disputed space, no construction contract
    for the disputed work, no formal service contract for the
    disputed matter, no shared business dispute over the
    disputed matter)
  The override "even if money is involved" applies ONLY
  to money as a REMEDY (repair cost, compensation for
  encroachment) — NOT to money owed for services or contracts.

PRIORITY 8 — consumer
  Individual consumer vs business dispute.

PRIORITY 9 — other
  When nothing fits clearly.

═══════════════════════════════════════════════════════════════════
CRITICAL BOUNDARY CASES
═══════════════════════════════════════════════════════════════════

family_business vs commercial_contract:
  Partners/friends who ran a business together → family_business
  Two strangers or companies transacting → commercial_contract
  Keywords for family_business: partners, partnership, profit sharing,
  ran together, co-founders, split profits, joint venture between
  people who knew each other personally.
  Keywords for commercial_contract: contract, invoice, vendor,
  supplier, formal agreement between companies or strangers.

family_business vs neighbour_dispute:
  Parties are both partners AND neighbours, and the dispute is
  ABOUT the shared business (profits, assets, ownership)?
  → family_business (Priority 1 wins)
  Parties are both partners AND neighbours, but THIS dispute
  is only about their adjacent residential property and has
  no connection to the business (e.g. one built a wall that
  encroaches on the other's home, unrelated to the shop
  they jointly run)?
  → neighbour_dispute (the business relationship exists but
  did not cause or govern this particular dispute)
  If the statements are genuinely unclear about whether the
  disputed matter is business-related or purely residential
  → other. Never guess.

landlord_tenant vs neighbour_dispute:
  Tenancy relationship exists AND the dispute concerns that
  tenancy?
  → landlord_tenant (Priority 2 wins)
  No tenancy — just adjacent property owners? Or a tenancy
  exists but the dispute is unrelated to it (e.g. a landlord
  and tenant who separately own adjacent, unrelated plots)?
  → neighbour_dispute

construction vs neighbour_dispute:
  Neighbours with a construction contract between them,
  and the dispute concerns that contract?
  → construction (Priority 3 wins)
  Neighbours disputing a wall that was built without a contract
  (e.g. one party claims encroachment by other's self-built wall)?
  → neighbour_dispute

debt_recovery vs commercial_contract:
  Explicit personal loan (money lent, money to be returned)?
  → debt_recovery
  Money owed for services rendered or goods supplied?
  → commercial_contract
  "He owes me money" without clear lending = NOT debt_recovery.

When genuinely unclear between two categories:
  → other. Never guess.

═══════════════════════════════════════════════════════════════════
EXTRACTION RULES
═══════════════════════════════════════════════════════════════════

1. Extract ONLY what is explicitly stated in the statements.
   Do NOT invent facts, infer unstated details, or assume.

2. Use "Party A" and "Party B" — NEVER use real names.

3. monetary_value: extract only if a specific amount is mentioned.
   If no amount stated → set to null. Do not estimate.

4. disputed_facts: facts each party disagrees about.
   undisputed_facts: facts both parties agree on
   (same event, same date, etc.).

5. extraction_confidence: your confidence in the extraction quality.
   0.9-1.0: clear statements, obvious category, specific facts
   0.7-0.8: reasonable clarity, category is evident
   0.5-0.7: vague statements, noise/parking disputes, ambiguous category
   Below 0.5: contradictory statements, insufficient detail → use other

6. core_dispute: one clear sentence summarising the main disagreement.
   Neutral language. No emotional words.

═══════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════

Return ONLY valid JSON. No explanation. No markdown. No extra text.

{
  "dispute_type": "one of the 9 category values",
  "core_dispute": "one neutral sentence describing the main issue",
  "claims_party_a": ["claim 1", "claim 2"],
  "claims_party_b": ["claim 1", "claim 2"],
  "disputed_facts": ["fact in dispute 1", "fact in dispute 2"],
  "undisputed_facts": ["agreed fact 1", "agreed fact 2"],
  "monetary_value": 50000.0,
  "jurisdiction_clear": true,
  "extraction_confidence": 0.85
}

monetary_value must be a number or null — never a string.
jurisdiction_clear: true if applicable law is clear, false if uncertain.
"""


# ── Main extraction function ──────────────────────────────────────────────────

def extract_conflict(
    statement_a: str,
    statement_b: str
) -> ConflictExtraction | dict:
    """
    Extract structured conflict from two party statements.

    Returns ConflictExtraction Pydantic model on success.
    Returns failed dict on failure — always check is_failed().

    This is CRITICAL — entire pipeline stops if this fails.
    """

    user_message = f"""
Extract the conflict structure from these two party statements.

PARTY A STATEMENT:
{statement_a.strip()}

PARTY B STATEMENT:
{statement_b.strip()}

Apply the dispute type definitions and precedence rules exactly.
Return only valid JSON.
"""

    result = call_with_retry(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        output_model=ConflictExtraction
    )

    return result


# ── Quick test ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    from ai.utils.ai_client import is_failed

    # Test S-04 — neighbour dispute (boundary encroachment)
    party_a = """
    My neighbour has built a boundary wall that encroaches 
    approximately 2 feet onto my property. I have the original 
    survey documents proving the boundary. Despite three written 
    requests he has refused to acknowledge the encroachment or 
    move the wall.
    """

    party_b = """
    I built the wall exactly on the boundary as per my own 
    survey conducted last year. My neighbour's survey is outdated.
    I have lived here for 15 years and the boundary has always 
    been where my wall now stands. I am willing to do a joint 
    survey but not to demolish the wall without proof.
    """

    print("Testing S-04 (neighbour_dispute)...")
    result = extract_conflict(party_a, party_b)

    if is_failed(result):
        print(f"FAILED: {result}")
    else:
        print(f"dispute_type: {result.dispute_type}")
        print(f"Expected:     neighbour_dispute")
        print(f"Match: {result.dispute_type.value == 'neighbour_dispute'}")
        print(f"confidence: {result.extraction_confidence}")
        print(f"core_dispute: {result.core_dispute}")

    print()

    # Test ambiguous case — neighbours who are also partners
    party_a_ambiguous = """
    My neighbour and I ran a grocery shop together for 3 years.
    We split profits equally. He has now stopped sharing profits 
    and also built a fence that blocks the shared driveway 
    we both use to access our homes.
    """

    party_b_ambiguous = """
    The shop profits were never equally split — I did most of 
    the work. The fence is on my property. My neighbour is 
    confusing two completely separate issues.
    """

    print("Testing ambiguous (should be family_business, not neighbour_dispute)...")
    result2 = extract_conflict(party_a_ambiguous, party_b_ambiguous)

    if is_failed(result2):
        print(f"FAILED: {result2}")
    else:
        print(f"dispute_type: {result2.dispute_type}")
        print(f"Expected:     family_business")
        print(f"Match: {result2.dispute_type.value == 'family_business'}")
        print(f"confidence: {result2.extraction_confidence}")