# Sub-system A Test Results — Week 2
**Tester:** Vaidant  
**Pass rate:** 8/8 (100%)  

| Scenario | Description | Expected | Got | Confidence | Status |
|---|---|---|---|---|---|
| S-01.json | Landlord-tenant security deposit dispute | landlord_tenant | DisputeType.LANDLORD_TENANT | 0.9 | ✅ PASS |
| S-02.json | Freelance unpaid invoice dispute | commercial_contract | DisputeType.COMMERCIAL_CONTRACT | 0.9 | ✅ PASS |
| S-03.json | Wrongful dismissal employment dispute | employment | DisputeType.EMPLOYMENT | 0.9 | ✅ PASS |
| S-04.json | Defective consumer product dispute | consumer | DisputeType.CONSUMER | 0.9 | ✅ PASS |
| S-05.json | Business partnership dissolution dispute | family_business | DisputeType.FAMILY_BUSINESS | 0.9 | ✅ PASS |
| S-06.json | Property boundary dispute between neighbours | property_boundary | DisputeType.PROPERTY_BOUNDARY | 0.9 | ✅ PASS |
| S-07.json | Construction delay and quality dispute | construction | DisputeType.CONSTRUCTION | 0.9 | ✅ PASS |
| S-08.json | Vague and ambiguous dispute - edge case test | other | DisputeType.OTHER | 0.6 | ✅ PASS |

## Failures to fix in Week 3:
- None! All scenarios passed ✅