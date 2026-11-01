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

1. family_and_relationships
   Disputes arising between family members, domestic partners, or relatives.
   Includes: family inheritance, divorce/separation arrangements, property division,
   support agreements, family venture division.

2. property_and_real_estate
   Disputes concerning real estate, land, tenancy, leases, or construction.
   Includes: landlord/tenant disputes, rent, security deposits, lease violations,
   property damage, construction/renovation contracts, property boundary lines.

3. money_and_financial_disputes
   Disputes involving loans, unpaid debts, personal lending, or financial claims.
   Includes: personal loans, unpaid promissory notes, informal debt recovery,
   repayment schedules, investment return disagreements.

4. business_and_commercial
   Disputes between commercial entities, co-founders, or businesses over contracts,
   services, supply, or commercial operations.
   Includes: vendor contracts, SLAs, deliverables, commercial partnership dissolution,
   business invoices and non-performance.

5. employment_and_workplace
   Disputes between employer and employee or workplace participants.
   Includes: wrongful termination, unpaid wages/severance, notice period,
   workplace grievances, employment contract terms, non-compete clauses.

6. consumer_dispute
   Disputes between an individual consumer and a business/seller.
   Includes: defective products, faulty services, refund claims,
   misleading representations, warranty disputes.

7. education
   Disputes involving educational institutions, students, staff, or parents.
   Includes: tuition/fees disputes, admissions, academic suspensions/disciplinary actions,
   hostel or school service agreements.

8. neighbourhood_and_community
   Disputes between neighbours or community members over shared physical spaces or resources.
   Includes: residential noise, parking disputes, shared wall/fence, encroachment,
   water drainage, pets, common community property.

9. personal
   Direct interpersonal disputes between acquaintances or individuals
   that do not fall under commercial, employment, or formal tenancy relations.
   Includes: personal property disputes, interpersonal communication disagreements,
   defamation/reputation between individuals.

10. other
   Use when the dispute does not clearly fit any of the above categories,
   or when statements are too vague or contradictory to classify confidently.
   When in doubt — use other. Never guess.

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

PRIORITY 1 — family_and_relationships
  Applies when the parties are family members, domestic partners,
  or relatives, AND the disputed subject matter concerns domestic
  relations, inheritance, divorce/separation, family support,
  or family-run venture property division.
  → family_and_relationships.
  Do NOT use family_and_relationships if two relatives have a purely
  arm's-length commercial business contract between registered companies;
  in that case, use business_and_commercial.

PRIORITY 2 — property_and_real_estate
  If a formal or informal tenancy/rental relationship, lease,
  property purchase, or construction/renovation contract is the
  source of the dispute (rent, security deposit, eviction, damage,
  lease terms, construction workmanship/delays, property boundaries):
  → property_and_real_estate, even if parties are also neighbours.
  Example: landlord living next door to tenant disputing security
  deposit or driveway access → property_and_real_estate.
  Example: neighbour hired contractor to renovate or build a wall,
  disputing workmanship or payment → property_and_real_estate.

PRIORITY 3 — business_and_commercial
  If a commercial contract, B2B service agreement, vendor invoice,
  or commercial co-founder/business partnership dissolution governs
  the dispute:
  → business_and_commercial.
  Example: freelance software/design services, supplier non-delivery,
  or co-founders dissolving a commercial startup → business_and_commercial.

PRIORITY 4 — employment_and_workplace
  If an employer-employee relationship or workplace grievance governs
  the dispute (wrongful termination, unpaid wages, notice periods,
  severance, non-compete clauses):
  → employment_and_workplace.

PRIORITY 5 — consumer_dispute
  Disputes between an individual retail consumer and a business/seller
  over defective products, faulty services, or warranty/refund claims:
  → consumer_dispute.

PRIORITY 6 — education
  Disputes involving schools, universities, colleges, students, or staff
  over tuition fees, admissions, disciplinary actions, or academic contracts:
  → education.

PRIORITY 7 — money_and_financial_disputes
  Applies when there is an explicit loan, promissory note, or personal
  lending transaction where the loan repayment itself is the dispute.
  → money_and_financial_disputes.
  "He owes me money" without a clear lending transaction is NOT enough.
  If money is owed for services rendered or invoices → business_and_commercial.
  If money is an unpaid wage or severance → employment_and_workplace.
  If money is a tenant deposit or rent → property_and_real_estate.

PRIORITY 8 — neighbourhood_and_community
  Apply ONLY when:
  - parties are adjacent neighbours or community members
  - the dispute is about shared physical spaces or resources
    (residential noise, parking, shared fence, encroachment, drainage, pets)
  - NO higher-priority relationship governs (no tenancy lease,
    no construction contract, no formal commercial contract)
  → neighbourhood_and_community.
  The override "even if money is involved" applies ONLY to money
  as a remedy (repair cost, compensation for damage) — NOT to commercial contracts.

PRIORITY 9 — personal
  Direct interpersonal disputes between acquaintances or individuals
  not covered by tenancy, employment, or commercial agreements
  (e.g. personal communication, reputation, personal belongings):
  → personal.

PRIORITY 10 — other
  When nothing fits clearly or statements are vague or contradictory.
  When in doubt — use other. Never guess.

═══════════════════════════════════════════════════════════════════
CRITICAL BOUNDARY CASES
═══════════════════════════════════════════════════════════════════

family_and_relationships vs business_and_commercial:
  Family members/domestic partners disputing inheritance or family ventures
  → family_and_relationships
  Unrelated co-founders, partners, or commercial companies transacting
  → business_and_commercial

property_and_real_estate vs neighbourhood_and_community:
  Tenancy or lease relationship exists AND dispute concerns that tenancy
  → property_and_real_estate (Priority 2 wins)
  Neighbours with a construction/renovation contract between them
  → property_and_real_estate (Priority 2 wins)
  Adjacent property owners disputing noise, parking, trees, or boundary
  encroachment with NO tenancy or construction contract
  → neighbourhood_and_community

money_and_financial_disputes vs business_and_commercial:
  Explicit personal loan (money lent between individuals to be returned)
  → money_and_financial_disputes
  Money owed for invoices, services rendered, or commercial goods
  → business_and_commercial

consumer_dispute vs business_and_commercial:
  Individual consumer buying goods/services for personal use from a seller
  → consumer_dispute
  Commercial transactions between businesses, contractors, or freelancers
  → business_and_commercial

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
  "dispute_type": "one of the 10 category values",
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

    print("Testing boundary encroachment (neighbourhood_and_community)...")
    result = extract_conflict(party_a, party_b)

    if is_failed(result):
        print(f"FAILED: {result}")
    else:
        print(f"dispute_type: {result.dispute_type}")
        print(f"Expected:     neighbourhood_and_community")
        print(f"Match: {result.dispute_type.value == 'neighbourhood_and_community'}")
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

    print("Testing ambiguous (should be business_and_commercial, not neighbourhood_and_community)...")
    result2 = extract_conflict(party_a_ambiguous, party_b_ambiguous)

    if is_failed(result2):
        print(f"FAILED: {result2}")
    else:
        print(f"dispute_type: {result2.dispute_type}")
        print(f"Expected:     business_and_commercial")
        print(f"Match: {result2.dispute_type.value == 'business_and_commercial'}")
        print(f"confidence: {result2.extraction_confidence}")