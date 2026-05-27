# State Machine — NLU Mediation Platform
# Full implementation: Week 2
# Stub created: Week 1 Day 5

from fastapi import HTTPException

# All 13 valid states
VALID_STATES = [
    "INTAKE_PENDING",
    "INTAKE_COMPLETE",
    "AI_PROCESSING",
    "AI_COMPLETE",
    "QUESTIONNAIRE_PENDING",
    "QUESTIONNAIRE_COMPLETE",
    "BATNA_WATNA_PROCESSING",
    "BATNA_WATNA_COMPLETE",
    "MEDIATION_IN_PROGRESS",
    "BATNA_WATNA_PROPOSED",
    "BATNA_WATNA_APPROVED",
    "BATNA_WATNA_REJECTED",
    "CASE_CLOSED"
]

# All 18 valid transitions (from_state -> [allowed_to_states])
VALID_TRANSITIONS = {
    "INTAKE_PENDING": ["INTAKE_COMPLETE"],
    "INTAKE_COMPLETE": ["AI_PROCESSING"],
    "AI_PROCESSING": ["AI_COMPLETE"],
    "AI_COMPLETE": ["QUESTIONNAIRE_PENDING"],
    "QUESTIONNAIRE_PENDING": ["QUESTIONNAIRE_COMPLETE"],
    "QUESTIONNAIRE_COMPLETE": ["BATNA_WATNA_PROCESSING"],
    "BATNA_WATNA_PROCESSING": ["BATNA_WATNA_COMPLETE"],
    "BATNA_WATNA_COMPLETE": ["MEDIATION_IN_PROGRESS"],
    "MEDIATION_IN_PROGRESS": ["BATNA_WATNA_PROPOSED"],
    "BATNA_WATNA_PROPOSED": ["BATNA_WATNA_APPROVED", "BATNA_WATNA_REJECTED"],
    "BATNA_WATNA_REJECTED": ["MEDIATION_IN_PROGRESS"],
    "BATNA_WATNA_APPROVED": ["CASE_CLOSED"],
    "CASE_CLOSED": []
}


def transition(current_state: str, new_state: str) -> str:
    """
    Validate and perform a state transition.
    RULE: No route handler ever sets case.status directly.
    ALL status changes go through this function.
    Returns new_state if valid, raises 409 if invalid.
    """
    if current_state not in VALID_TRANSITIONS:
        raise HTTPException(
            status_code=409,
            detail=f"Invalid current state: {current_state}"
        )

    allowed = VALID_TRANSITIONS[current_state]
    if new_state not in allowed:
        raise HTTPException(
            status_code=409,
            detail=f"Invalid transition: {current_state} -> {new_state}. Allowed: {allowed}"
        )

    return new_state