# Dispute Types Modification & Revert Guide

This document records the exact changes made across the codebase to update the Dispute Types to the 10 categories:
1. **Family and Relationships** (`family_and_relationships`)
2. **Property and real estate** (`property_and_real_estate`)
3. **Money and financial disputes** (`money_and_financial_disputes`)
4. **Business and Commercial** (`business_and_commercial`)
5. **Employment and workplace** (`employment_and_workplace`)
6. **Consumer dispute** (`consumer_dispute`)
7. **Education** (`education`)
8. **Neighbourhood and comunity disputes** (`neighbourhood_and_community`)
9. **Personal** (`personal`)
10. **Others** (`other`)

> **HOW TO REVERT:**
> If you ever want to revert all changes back to the original state:
> Simply provide this document to the assistant and say:
> *"Revert all changes described in DISPUTE_TYPES_CHANGES_AND_REVERT_GUIDE.md back to their original form."*
> Or run `git checkout -- .` in the terminal if no other uncommitted changes exist.

---

## Summary of Modified Files

| # | Folder / Directory | File Path | Type |
|---|---|---|---|
| 1 | `nlu-backend/app` | `nlu-backend/app/enums.py` | Backend Enum |
| 2 | `nlu-backend/app/api/v1/routes` | `nlu-backend/app/api/v1/routes/cases.py` | Backend API Route |
| 3 | `nlu-backend` | `nlu-backend/tasks.py` | Background Worker Task |
| 4 | `ai` | `ai/schemas.py` | AI Pydantic Schemas |
| 5 | `ai/subsystems` | `ai/subsystems/subsystem_a.py` | Conflict Extraction AI |
| 6 | `ai/subsystems` | `ai/subsystems/subsystem_c.py` | Questionnaire AI |
| 7 | `ai/subsystems` | `ai/subsystems/subsystem_g.py` | Mediatability AI |
| 8 | `frontend/src/pages/mediator` | `frontend/src/pages/mediator/DashboardPage.jsx` | Mediator UI Modal |
| 9 | `frontend/src/pages/party` | `frontend/src/pages/party/Applyformediation.jsx` | Party Apply UI |
| 10 | `frontend/src/pages/party` | `frontend/src/pages/party/IntakeWizard.jsx` | Intake Wizard UI |
| 11 | `frontend/src/pages/party` | `frontend/src/pages/party/CaseDetails.jsx` | Case Details UI |

---

## Detailed File-by-File Changes

### 1. `nlu-backend/app/enums.py`
* **Folder:** `nlu-mediation-platform/nlu-backend/app/`
* **File:** `nlu-backend/app/enums.py`
* **Original Lines:** 3 – 12
* **Current Lines:** 3 – 24

#### BEFORE (Original Code):
```python
class DisputeType(str, Enum):
    LANDLORD_TENANT     = "landlord_tenant"
    EMPLOYMENT          = "employment"
    COMMERCIAL_CONTRACT = "commercial_contract"
    NEIGHBOUR_DISPUTE   = "neighbour_dispute"
    FAMILY_BUSINESS     = "family_business"
    CONSTRUCTION        = "construction"
    CONSUMER            = "consumer"
    DEBT_RECOVERY       = "debt_recovery"
    OTHER               = "other"
```

#### AFTER (Current Updated Code):
```python
class DisputeType(str, Enum):
    # 10 Dispute Categories
    FAMILY_RELATIONSHIPS       = "family_and_relationships"
    PROPERTY_REAL_ESTATE       = "property_and_real_estate"
    MONEY_FINANCIAL            = "money_and_financial_disputes"
    BUSINESS_COMMERCIAL        = "business_and_commercial"
    EMPLOYMENT_WORKPLACE       = "employment_and_workplace"
    CONSUMER_DISPUTE           = "consumer_dispute"
    EDUCATION                  = "education"
    NEIGHBOURHOOD_COMMUNITY    = "neighbourhood_and_community"
    PERSONAL                   = "personal"
    OTHER                      = "other"

    # Legacy types for backwards compatibility
    LANDLORD_TENANT            = "landlord_tenant"
    EMPLOYMENT                 = "employment"
    COMMERCIAL_CONTRACT        = "commercial_contract"
    NEIGHBOUR_DISPUTE          = "neighbour_dispute"
    FAMILY_BUSINESS            = "family_business"
    CONSTRUCTION               = "construction"
    CONSUMER                   = "consumer"
    DEBT_RECOVERY              = "debt_recovery"
```

---

### 2. `nlu-backend/app/api/v1/routes/cases.py`
* **Folder:** `nlu-mediation-platform/nlu-backend/app/api/v1/routes/`
* **File:** `nlu-backend/app/api/v1/routes/cases.py`
* **Original Lines:** 467 – 471
* **Current Lines:** 467 – 475

#### BEFORE (Original Code):
```python
    valid_types = [
    "landlord_tenant", "employment", "commercial_contract",
    "neighbour_dispute", "family_business", "construction",
    "consumer", "debt_recovery", "other"
]
```

#### AFTER (Current Updated Code):
```python
    valid_types = [
        "family_and_relationships", "property_and_real_estate", "money_and_financial_disputes",
        "business_and_commercial", "employment_and_workplace", "consumer_dispute",
        "education", "neighbourhood_and_community", "personal", "other",
        # Legacy support
        "landlord_tenant", "employment", "commercial_contract",
        "neighbour_dispute", "family_business", "construction",
        "consumer", "debt_recovery"
    ]
```

---

### 3. `nlu-backend/tasks.py`
* **Folder:** `nlu-mediation-platform/nlu-backend/`
* **File:** `nlu-backend/tasks.py`
* **Original Lines:** 439 – 443
* **Current Lines:** 439 – 447

#### BEFORE (Original Code):
```python
        valid_dispute_types = {
            "landlord_tenant", "employment", "commercial_contract",
            "neighbour_dispute", "family_business", "construction",
            "consumer", "debt_recovery", "other"
        }
```

#### AFTER (Current Updated Code):
```python
        valid_dispute_types = {
            "family_and_relationships", "property_and_real_estate", "money_and_financial_disputes",
            "business_and_commercial", "employment_and_workplace", "consumer_dispute",
            "education", "neighbourhood_and_community", "personal", "other",
            # Legacy
            "landlord_tenant", "employment", "commercial_contract",
            "neighbour_dispute", "family_business", "construction",
            "consumer", "debt_recovery"
        }
```

---

### 4. `ai/schemas.py`
* **Folder:** `nlu-mediation-platform/ai/`
* **File:** `ai/schemas.py`
* **Original Lines:** 32 – 41
* **Current Lines:** 32 – 53

#### BEFORE (Original Code):
```python
class DisputeType(str, Enum):
    LANDLORD_TENANT     = "landlord_tenant"
    EMPLOYMENT          = "employment"
    COMMERCIAL_CONTRACT = "commercial_contract"
    NEIGHBOUR_DISPUTE   = "neighbour_dispute"
    FAMILY_BUSINESS     = "family_business"
    CONSTRUCTION        = "construction"
    CONSUMER            = "consumer"
    DEBT_RECOVERY       = "debt_recovery"
    OTHER               = "other"
```

#### AFTER (Current Updated Code):
```python
class DisputeType(str, Enum):
    # 10 Dispute Categories
    FAMILY_RELATIONSHIPS       = "family_and_relationships"
    PROPERTY_REAL_ESTATE       = "property_and_real_estate"
    MONEY_FINANCIAL            = "money_and_financial_disputes"
    BUSINESS_COMMERCIAL        = "business_and_commercial"
    EMPLOYMENT_WORKPLACE       = "employment_and_workplace"
    CONSUMER_DISPUTE           = "consumer_dispute"
    EDUCATION                  = "education"
    NEIGHBOURHOOD_COMMUNITY    = "neighbourhood_and_community"
    PERSONAL                   = "personal"
    OTHER                      = "other"

    # Legacy types for backwards compatibility
    LANDLORD_TENANT            = "landlord_tenant"
    EMPLOYMENT                 = "employment"
    COMMERCIAL_CONTRACT        = "commercial_contract"
    NEIGHBOUR_DISPUTE          = "neighbour_dispute"
    FAMILY_BUSINESS            = "family_business"
    CONSTRUCTION               = "construction"
    CONSUMER                   = "consumer"
    DEBT_RECOVERY              = "debt_recovery"
```

---

### 5. `ai/subsystems/subsystem_a.py`
* **Folder:** `nlu-mediation-platform/ai/subsystems/`
* **File:** `ai/subsystems/subsystem_a.py`

#### Part A: Category definitions in SYSTEM_PROMPT
* **Original Lines:** 34 – 117
* **Current Lines:** 34 – 87

##### BEFORE (Original Code):
```python
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
```

##### AFTER (Current Updated Code):
```python
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
```

#### Part B: OUTPUT FORMAT example
* **Original Line:** 288 (was `"dispute_type": "one of the 9 category values",`)
* **Current Line:** 258 (now `"dispute_type": "one of the 10 category values",`)

##### BEFORE (Original Code):
```json
  "dispute_type": "one of the 9 category values",
```

##### AFTER (Current Updated Code):
```json
  "dispute_type": "one of the 10 category values",
```

---

### 6. `ai/subsystems/subsystem_c.py`
* **Folder:** `nlu-mediation-platform/ai/subsystems/`
* **File:** `ai/subsystems/subsystem_c.py`
* **Original Lines:** 38 – 47
* **Current Lines:** 38 – 48

#### BEFORE (Original Code):
```python
2. Different dispute types need different questions:
   - landlord_tenant: focus on deposit, condition, dates, notice period
   - employment: focus on contract terms, notice period, performance records
   - commercial_contract: focus on deliverables, deadlines, payment terms
   - neighbour_dispute: focus on survey records, documents, timeline of construction
   - family_business: focus on partnership deed, contributions, profit sharing
   - construction: focus on contract, deadlines, quality standards, payments
   - consumer: focus on warranty, usage, complaint timeline
   - debt_recovery: focus on loan agreement, repayment terms, evidence
```

#### AFTER (Current Updated Code):
```python
2. Different dispute types need different questions:
   - family_and_relationships / family_business: focus on family agreements, contributions, communications, expectations
   - property_and_real_estate / landlord_tenant / construction: focus on ownership/tenancy documents, condition, dates, notices, contracts
   - money_and_financial_disputes / debt_recovery: focus on loan/payment agreements, transaction records, repayment terms, evidence
   - business_and_commercial / commercial_contract: focus on contracts, deliverables, deadlines, invoices, payment terms
   - employment_and_workplace / employment: focus on employment contract terms, roles, workplace events, notice period, compensation
   - consumer_dispute / consumer: focus on purchase proof, product/service defect, warranty, complaint timeline
   - education: focus on enrollment/admissions agreement, fees, academic/administrative records, grievance timeline
   - neighbourhood_and_community / neighbour_dispute: focus on survey records, shared space usage, disturbance timeline, prior communication
   - personal: focus on personal relationship context, incident timeline, communication history, non-monetary remedies
```

---

### 7. `ai/subsystems/subsystem_g.py`
* **Folder:** `nlu-mediation-platform/ai/subsystems/`
* **File:** `ai/subsystems/subsystem_g.py`
* **Original Lines:** 37 – 52
* **Current Lines:** 37 – 58

#### BEFORE (Original Code):
```python
    # Factor 1: Dispute type suitability (0-2 points)
    # High suitability types — well-established mediation track record
    high_suitability = ["landlord_tenant", "consumer", "commercial_contract"]
    # Medium suitability types — mediatable but more complex
    # Neighbour disputes mediate well — neighbours often prefer
    # avoiding court to maintain the future relationship.
    medium_suitability = ["employment", "construction", "debt_recovery", "neighbour_dispute"]
    # Low suitability — family_business, other get 0

    if conflict.dispute_type.value in high_suitability:
        score += 2
    elif conflict.dispute_type.value in medium_suitability:
        score += 1
    else:
        score += 0  # family_business, other
```

#### AFTER (Current Updated Code):
```python
    # Factor 1: Dispute type suitability (0-2 points)
    # High suitability types — well-established mediation track record
    high_suitability = [
        "property_and_real_estate", "consumer_dispute", "business_and_commercial",
        "landlord_tenant", "consumer", "commercial_contract"
    ]
    # Medium suitability types — mediatable but more complex
    # Neighbour disputes mediate well — neighbours often prefer
    # avoiding court to maintain the future relationship.
    medium_suitability = [
        "employment_and_workplace", "money_and_financial_disputes", "neighbourhood_and_community", "education",
        "employment", "construction", "debt_recovery", "neighbour_dispute"
    ]
    # Low suitability — family_and_relationships, personal, family_business, other get 0

    if conflict.dispute_type.value in high_suitability:
        score += 2
    elif conflict.dispute_type.value in medium_suitability:
        score += 1
    else:
        score += 0  # family_and_relationships, personal, other
```

---

### 8. `frontend/src/pages/mediator/DashboardPage.jsx`
* **Folder:** `nlu-mediation-platform/frontend/src/pages/mediator/`
* **File:** `frontend/src/pages/mediator/DashboardPage.jsx`
* **Original Lines:** 758 – 768
* **Current Lines:** 758 – 769

#### BEFORE (Original Code):
```jsx
                <option value="">Select dispute type</option>
                <option value="landlord_tenant">Landlord / Tenant</option>
                <option value="employment">Employer / Employee</option>
                <option value="commercial_contract">Business / Contract</option>
                <option value="neighbour_dispute">Neighbour Dispute</option>
                <option value="family_business">Family / Partnership</option>
                <option value="construction">Construction</option>
                <option value="consumer">Consumer / Product</option>
                <option value="debt_recovery">Debt / Loan</option>
                <option value="other">Other</option>
```

#### AFTER (Current Updated Code):
```jsx
                <option value="">Select dispute type</option>
                <option value="family_and_relationships">Family and Relationships</option>
                <option value="property_and_real_estate">Property and real estate</option>
                <option value="money_and_financial_disputes">Money and financial disputes</option>
                <option value="business_and_commercial">Business and Commercial</option>
                <option value="employment_and_workplace">Employment and workplace</option>
                <option value="consumer_dispute">Consumer dispute</option>
                <option value="education">Education</option>
                <option value="neighbourhood_and_community">Neighbourhood and comunity disputes</option>
                <option value="personal">Personal</option>
                <option value="other">Others</option>
```

---

### 9. `frontend/src/pages/party/Applyformediation.jsx`
* **Folder:** `nlu-mediation-platform/frontend/src/pages/party/`
* **File:** `frontend/src/pages/party/Applyformediation.jsx`
* **Original Lines:** 8 – 18
* **Current Lines:** 8 – 19

#### BEFORE (Original Code):
```javascript
const DISPUTE_TYPES = [
  { value: 'landlord_tenant', label: 'Landlord / Tenant', icon: '🏠' },
  { value: 'employment', label: 'Employer / Employee', icon: '💼' },
  { value: 'commercial_contract', label: 'Business / Contract', icon: '🤝' },
  { value: 'neighbour_dispute', label: 'Neighbour Dispute', icon: '🏘️' },
  { value: 'family_business', label: 'Family / Partnership', icon: '👨‍👩‍👧' },
  { value: 'construction', label: 'Construction', icon: '🏗️' },
  { value: 'consumer', label: 'Consumer / Product', icon: '🛒' },
  { value: 'debt_recovery', label: 'Debt / Loan', icon: '💰' },
  { value: 'other', label: 'Other', icon: '📋' },
]
```

#### AFTER (Current Updated Code):
```javascript
const DISPUTE_TYPES = [
  { value: 'family_and_relationships', label: 'Family and Relationships', icon: '👨‍👩‍👧' },
  { value: 'property_and_real_estate', label: 'Property and Real Estate', icon: '🏠' },
  { value: 'money_and_financial_disputes', label: 'Money and Financial Disputes', icon: '💰' },
  { value: 'business_and_commercial', label: 'Business and Commercial', icon: '🤝' },
  { value: 'employment_and_workplace', label: 'Employment and Workplace', icon: '💼' },
  { value: 'consumer_dispute', label: 'Consumer Dispute', icon: '🛒' },
  { value: 'education', label: 'Education', icon: '🎓' },
  { value: 'neighbourhood_and_community', label: 'Neighbourhood and Community Disputes', icon: '🏘️' },
  { value: 'personal', label: 'Personal', icon: '👤' },
  { value: 'other', label: 'Others', icon: '📋' },
]
```

---

### 10. `frontend/src/pages/party/IntakeWizard.jsx`
* **Folder:** `nlu-mediation-platform/frontend/src/pages/party/`
* **File:** `frontend/src/pages/party/IntakeWizard.jsx`
* **Original Lines:** 16 – 26
* **Current Lines:** 16 – 27

#### BEFORE (Original Code):
```javascript
const RELATIONSHIP_OPTIONS = [
  { value: 'landlord_tenant', label: 'Landlord / Tenant', icon: '🏠' },
  { value: 'employment', label: 'Employer / Employee', icon: '💼' },
  { value: 'commercial_contract', label: 'Business / Contract', icon: '🤝' },
  { value: 'neighbour_dispute', label: 'Neighbour Dispute', icon: '🏘️' },
  { value: 'family_business', label: 'Family / Partnership', icon: '👨‍👩‍👧' },
  { value: 'construction', label: 'Construction', icon: '🏗️' },
  { value: 'consumer', label: 'Consumer / Product', icon: '🛒' },
  { value: 'debt_recovery', label: 'Debt / Loan', icon: '💰' },
  { value: 'other', label: 'Other', icon: '📋' },
]
```

#### AFTER (Current Updated Code):
```javascript
const RELATIONSHIP_OPTIONS = [
  { value: 'family_and_relationships', label: 'Family and Relationships', icon: '👨‍👩‍👧' },
  { value: 'property_and_real_estate', label: 'Property and Real Estate', icon: '🏠' },
  { value: 'money_and_financial_disputes', label: 'Money and Financial Disputes', icon: '💰' },
  { value: 'business_and_commercial', label: 'Business and Commercial', icon: '🤝' },
  { value: 'employment_and_workplace', label: 'Employment and Workplace', icon: '💼' },
  { value: 'consumer_dispute', label: 'Consumer Dispute', icon: '🛒' },
  { value: 'education', label: 'Education', icon: '🎓' },
  { value: 'neighbourhood_and_community', label: 'Neighbourhood and Community Disputes', icon: '🏘️' },
  { value: 'personal', label: 'Personal', icon: '👤' },
  { value: 'other', label: 'Others', icon: '📋' },
]
```

---

### 11. `frontend/src/pages/party/CaseDetails.jsx`
* **Folder:** `nlu-mediation-platform/frontend/src/pages/party/`
* **File:** `frontend/src/pages/party/CaseDetails.jsx`
* **Original Lines:** 62 – 72
* **Current Lines:** 62 – 82

#### BEFORE (Original Code):
```javascript
const RELATIONSHIP_LABELS = {
  landlord_tenant:      'Landlord / Tenant',
  employment:           'Employer / Employee',
  commercial_contract:  'Business / Contract',
  neighbour_dispute: 'Neighbour Dispute',
  family_business:      'Family / Partnership',
  construction:         'Construction',
  consumer:             'Consumer / Product',
  debt_recovery:        'Debt / Loan',
  other:                'Other',
}
```

#### AFTER (Current Updated Code):
```javascript
const RELATIONSHIP_LABELS = {
  family_and_relationships:      'Family and Relationships',
  property_and_real_estate:      'Property and Real Estate',
  money_and_financial_disputes:  'Money and Financial Disputes',
  business_and_commercial:       'Business and Commercial',
  employment_and_workplace:      'Employment and Workplace',
  consumer_dispute:              'Consumer Dispute',
  education:                     'Education',
  neighbourhood_and_community:   'Neighbourhood and Community Disputes',
  personal:                      'Personal',
  other:                         'Others',
  // Legacy labels
  landlord_tenant:               'Landlord / Tenant',
  employment:                    'Employer / Employee',
  commercial_contract:           'Business / Contract',
  neighbour_dispute:             'Neighbour Dispute',
  family_business:               'Family / Partnership',
  construction:                  'Construction',
  consumer:                      'Consumer / Product',
  debt_recovery:                 'Debt / Loan',
}
```
