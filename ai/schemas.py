"""
schemas.py
NLU Shimla — AI-Powered Mediation Platform
-------------------------------------------
Pydantic output models for all 7 AI sub-systems.

This file is the single source of truth for AI output structure.
- Vaidant owns: ConflictExtraction, NeutralSummary, BatnaWatnaOutput
- Rishika owns:  QuestionnaireOutput, BiasRemovalOutput, ToneAnalysis, MediatabilitySore

Rules:
  1. No other file should define its own AI output models.
  2. All Claude API response parsing must validate against these models.
  3. Changes to any model require both AI roles to agree — downstream
     sub-systems and Celery tasks depend on these field names.

Version: 1.0  |  Week 1
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


# ──────────────────────────────────────────────────────────────────────────────
# SHARED ENUMS
# ──────────────────────────────────────────────────────────────────────────────

class DisputeType(str, Enum):
    LANDLORD_TENANT       = "landlord_tenant"
    EMPLOYMENT            = "employment"
    COMMERCIAL_CONTRACT   = "commercial_contract"
    PROPERTY_BOUNDARY     = "property_boundary"
    FAMILY_BUSINESS       = "family_business"
    CONSTRUCTION          = "construction"
    CONSUMER              = "consumer"
    DEBT_RECOVERY         = "debt_recovery"
    OTHER                 = "other"


class StrengthLabel(str, Enum):
    """Human-facing label shown to parties and mediator."""
    STRONG   = "Strong"
    MODERATE = "Moderate"
    WEAK     = "Weak"


class MediatabilitBand(str, Enum):
    HIGH   = "High"
    MEDIUM = "Medium"
    LOW    = "Low"


class BiasType(str, Enum):
    EMOTIONAL_LANGUAGE  = "emotional_language"
    ONE_SIDED_FRAMING   = "one_sided_framing"
    LOADED_TERMINOLOGY  = "loaded_terminology"
    FACTUAL_ASSUMPTION  = "factual_assumption"
    NONE_DETECTED       = "none_detected"


class ToneCategory(str, Enum):
    HOSTILE      = "hostile"
    ADVERSARIAL  = "adversarial"
    NEUTRAL      = "neutral"
    COOPERATIVE  = "cooperative"
    CONCILIATORY = "conciliatory"


# ──────────────────────────────────────────────────────────────────────────────
# SUB-SYSTEM A — Conflict Extraction
# Owner: Vaidant
# Input:  raw party statements (party_a_statement, party_b_statement)
# Output: structured conflict JSON consumed by ALL downstream sub-systems
# ──────────────────────────────────────────────────────────────────────────────

class ConflictExtraction(BaseModel):
    """
    Output of sub-system A.
    Every other sub-system receives this as input — never the raw statements.
    If extraction_confidence < 0.5, flag for mediator review before proceeding.
    """

    dispute_type: DisputeType = Field(
        ...,
        description="Category of the dispute."
    )
    core_dispute: str = Field(
        ...,
        description="One to two sentence neutral description of the central disagreement.",
        max_length=400
    )
    claims_party_a: List[str] = Field(
        ...,
        description="List of distinct claims made by Party A. Each item is one claim.",
        min_length=1
    )
    claims_party_b: List[str] = Field(
        ...,
        description="List of distinct claims made by Party B. Each item is one claim.",
        min_length=1
    )
    disputed_facts: List[str] = Field(
        ...,
        description="Facts that both parties disagree on.",
    )
    undisputed_facts: List[str] = Field(
        default_factory=list,
        description="Facts both parties appear to agree on, if any."
    )
    monetary_value: Optional[float] = Field(
        default=None,
        description="Estimated monetary value of the dispute in INR. None if not applicable.",
        ge=0
    )
    jurisdiction_clear: bool = Field(
        ...,
        description="True if the applicable jurisdiction can be reasonably inferred."
    )
    extraction_confidence: float = Field(
        ...,
        description="Model's confidence in the extraction quality. 0.0 to 1.0.",
        ge=0.0,
        le=1.0
    )


# ──────────────────────────────────────────────────────────────────────────────
# SUB-SYSTEM B — Neutral Summary
# Owner: Vaidant
# Input:  ConflictExtraction output
# Output: balanced summary shown to the mediator
# ──────────────────────────────────────────────────────────────────────────────

class NeutralSummary(BaseModel):
    """
    Output of sub-system B.
    Generated from ConflictExtraction JSON, not from raw party statements.
    Must be reviewed by sub-system E (bias removal) before display.
    """

    summary: str = Field(
        ...,
        description="Balanced, neutral summary of the dispute. No party's language should dominate.",
        max_length=800
    )
    party_a_position: str = Field(
        ...,
        description="Single paragraph summarising Party A's position neutrally.",
        max_length=400
    )
    party_b_position: str = Field(
        ...,
        description="Single paragraph summarising Party B's position neutrally.",
        max_length=400
    )
    key_issues: List[str] = Field(
        ...,
        description="Ordered list of the core issues to be resolved, most important first.",
        min_length=1,
        max_length=6
    )
    common_ground: Optional[str] = Field(
        default=None,
        description="Any shared interests or undisputed facts that could serve as a starting point."
    )
    bias_check_required: bool = Field(
        default=True,
        description="Always True — sub-system E must run before this summary is shown to parties."
    )


# ──────────────────────────────────────────────────────────────────────────────
# SUB-SYSTEM C — Questionnaire Generation
# Owner: Rishika
# Input:  ConflictExtraction output
# Output: tailored questions sent to each party
# ──────────────────────────────────────────────────────────────────────────────

class Question(BaseModel):
    """A single question in the questionnaire."""

    question_id: str = Field(
        ...,
        description="Unique identifier, e.g. 'q_01', 'q_02'."
    )
    question_text: str = Field(
        ...,
        description="The question as shown to the party.",
        max_length=300
    )
    directed_at: str = Field(
        ...,
        description="'party_a', 'party_b', or 'both'."
    )
    question_type: str = Field(
        ...,
        description="'open_ended', 'yes_no', or 'scale_1_5'."
    )
    purpose: str = Field(
        ...,
        description="Why this question is being asked. Internal field — not shown to parties.",
        max_length=200
    )


class QuestionnaireOutput(BaseModel):
    """
    Output of sub-system C.
    Questions are tailored to the specific dispute type from ConflictExtraction.
    Generic questions that could apply to any dispute indicate a prompt failure.
    """

    questions: List[Question] = Field(
        ...,
        description="List of questions for this case.",
        min_length=3,
        max_length=10
    )
    questionnaire_rationale: str = Field(
        ...,
        description="Brief explanation of why these questions were chosen for this dispute type.",
        max_length=300
    )


# ──────────────────────────────────────────────────────────────────────────────
# SUB-SYSTEM D — BATNA / WATNA
# Owner: Vaidant
# Input:  ConflictExtraction output + questionnaire responses
# Output: negotiation position analysis for each party
#
# INVARIANT: batna_score >= watna_score always.
# Enforced by model_validator — do not bypass.
# Parties see StrengthLabel only. Numeric scores are internal.
# ──────────────────────────────────────────────────────────────────────────────

class PartyNegotiationPosition(BaseModel):
    """BATNA/WATNA analysis for one party."""

    batna_score: int = Field(
        ...,
        description="Best Alternative to Negotiated Agreement score. Internal use only. 1–10.",
        ge=1,
        le=10
    )
    watna_score: int = Field(
        ...,
        description="Worst Alternative to Negotiated Agreement score. Internal use only. 1–10.",
        ge=1,
        le=10
    )
    batna_label: StrengthLabel = Field(
        ...,
        description="Human-facing label for BATNA strength. Shown to mediator and party."
    )
    watna_label: StrengthLabel = Field(
        ...,
        description="Human-facing label for WATNA strength. Shown to mediator and party."
    )
    batna_reasoning: str = Field(
        ...,
        description="Explanation of the BATNA assessment. Shown to the party.",
        max_length=400
    )
    watna_reasoning: str = Field(
        ...,
        description="Explanation of the WATNA assessment. Shown to the party.",
        max_length=400
    )
    negotiation_guidance: str = Field(
        ...,
        description=(
            "Practical negotiation guidance for this party based on their position. "
            "This is negotiation strategy guidance, not legal advice. "
            "Shown to the party."
        ),
        max_length=500
    )
    consult_solicitor_flag: bool = Field(
        default=False,
        description=(
            "Set True when jurisdiction_clear=False in ConflictExtraction, "
            "or when legal complexity is high. Triggers 'Consult a solicitor' notice."
        )
    )

    @model_validator(mode="after")
    def enforce_batna_watna_invariant(self) -> "PartyNegotiationPosition":
        """
        BATNA must always be >= WATNA.
        If the LLM returns WATNA > BATNA, set both to their average.
        This is a hard safety net — do not remove.
        """
        if self.watna_score > self.batna_score:
            avg = (self.batna_score + self.watna_score) // 2
            self.batna_score = avg
            self.watna_score = avg
        return self


class BatnaWatnaOutput(BaseModel):
    """
    Output of sub-system D.
    Contains negotiation position analysis for both parties.
    Mediator sees both. Each party sees only their own section.
    """

    party_a: PartyNegotiationPosition
    party_b: PartyNegotiationPosition
    overall_settlement_zone: Optional[str] = Field(
        default=None,
        description=(
            "If both parties' positions suggest a potential zone of agreement, "
            "describe it briefly. Mediator-only field."
        ),
        max_length=400
    )
    disclaimer: str = Field(
        default=(
            "This analysis provides negotiation guidance only and does not constitute "
            "legal advice. Parties should consult a qualified legal professional for "
            "advice specific to their situation."
        ),
        description="Mandatory disclaimer shown alongside all BATNA/WATNA output."
    )


# ──────────────────────────────────────────────────────────────────────────────
# SUB-SYSTEM E — Bias Removal
# Owner: Rishika
# Input:  NeutralSummary output
# Output: bias-checked version of the summary + flags
# ──────────────────────────────────────────────────────────────────────────────

class BiasFlag(BaseModel):
    """A single detected bias instance."""

    bias_type: BiasType
    original_phrase: str = Field(
        ...,
        description="The exact phrase from the summary that contains bias.",
        max_length=200
    )
    suggested_replacement: str = Field(
        ...,
        description="Neutral replacement for the biased phrase.",
        max_length=200
    )
    affects_party: str = Field(
        ...,
        description="Which party is disadvantaged: 'party_a', 'party_b', or 'both'."
    )


class BiasRemovalOutput(BaseModel):
    """
    Output of sub-system E.
    Runs on NeutralSummary output before anything is shown to parties.
    If bias_detected=True, the revised_summary replaces the original.
    If bias_detected=False, the original summary is used as-is.
    """

    bias_detected: bool = Field(
        ...,
        description="True if any bias was found in the summary."
    )
    bias_flags: List[BiasFlag] = Field(
        default_factory=list,
        description="List of detected bias instances. Empty if bias_detected=False."
    )
    revised_summary: Optional[str] = Field(
        default=None,
        description=(
            "De-biased version of the full summary. "
            "Required if bias_detected=True. None if no bias found."
        ),
        max_length=800
    )
    revised_party_a_position: Optional[str] = Field(
        default=None,
        description="De-biased Party A position. Required if that section had bias.",
        max_length=400
    )
    revised_party_b_position: Optional[str] = Field(
        default=None,
        description="De-biased Party B position. Required if that section had bias.",
        max_length=400
    )
    bias_check_passed: bool = Field(
        ...,
        description=(
            "True when the summary is safe to show. "
            "True if no bias detected, or if revisions were successfully made."
        )
    )

    @model_validator(mode="after")
    def revised_summary_required_when_bias_detected(self) -> "BiasRemovalOutput":
        if self.bias_detected and self.revised_summary is None:
            raise ValueError(
                "revised_summary is required when bias_detected=True."
            )
        return self


# ──────────────────────────────────────────────────────────────────────────────
# SUB-SYSTEM F — Tone Analysis
# Owner: Rishika
# Input:  raw party statements
# Note:   Flagged as cuttable in MVP risk review. Included for completeness.
#         If not used in Burst 1 pipeline, schema stays here for future use.
# ──────────────────────────────────────────────────────────────────────────────

class PartyTone(BaseModel):
    """Tone analysis for one party's statement."""

    tone_category: ToneCategory
    hostility_score: int = Field(
        ...,
        description="How hostile the language is. 1 (calm) to 10 (extremely hostile).",
        ge=1,
        le=10
    )
    openness_score: int = Field(
        ...,
        description="How open to resolution the language suggests. 1 (closed) to 10 (very open).",
        ge=1,
        le=10
    )
    key_emotional_phrases: List[str] = Field(
        default_factory=list,
        description="Phrases that most strongly indicate the detected tone.",
        max_length=5
    )
    tone_summary: str = Field(
        ...,
        description="One sentence describing the overall tone. Mediator-only field.",
        max_length=200
    )


class ToneAnalysis(BaseModel):
    """
    Output of sub-system F.
    Mediator-only — never shown to parties.
    Helps mediator understand emotional state before the session.
    """

    party_a_tone: PartyTone
    party_b_tone: PartyTone
    combined_conflict_intensity: int = Field(
        ...,
        description=(
            "Overall intensity of the conflict based on both tones combined. "
            "1 (low) to 10 (very high)."
        ),
        ge=1,
        le=10
    )
    mediator_advisory: str = Field(
        ...,
        description=(
            "Brief note to the mediator on how to approach the session "
            "given the detected tones."
        ),
        max_length=300
    )


# ──────────────────────────────────────────────────────────────────────────────
# SUB-SYSTEM G — Mediatability Scoring
# Owner: Rishika
# Input:  ConflictExtraction output + BatnaWatnaOutput
# Output: assessment of how suitable this dispute is for mediation
# ──────────────────────────────────────────────────────────────────────────────

class MediatabilitySore(BaseModel):
    """
    Output of sub-system G.
    NOTE: 'Sore' spelling matches the roadmap. Do not rename — field names
    are referenced in the Celery pipeline and mediator dashboard.

    Score is internal. Band (High / Medium / Low) is shown to the mediator.
    Parties do not see the mediatability score.
    """

    mediatability_score: int = Field(
        ...,
        description="Internal numeric score. 1 (very unlikely to settle) to 10 (very likely).",
        ge=1,
        le=10
    )
    mediatability_band: MediatabilitBand = Field(
        ...,
        description="Human-facing band shown to the mediator."
    )
    positive_factors: List[str] = Field(
        ...,
        description="Factors that make this dispute suitable for mediation.",
        min_length=1,
        max_length=5
    )
    negative_factors: List[str] = Field(
        default_factory=list,
        description="Factors that may make mediation difficult.",
        max_length=5
    )
    recommended_approach: str = Field(
        ...,
        description=(
            "Brief recommendation to the mediator on how to approach this case "
            "based on the mediatability assessment."
        ),
        max_length=400
    )
    score_justification: str = Field(
        ...,
        description="One paragraph explaining why this score was assigned.",
        max_length=400
    )

    @model_validator(mode="after")
    def sync_band_with_score(self) -> "MediatabilitySore":
        """
        Keep band consistent with numeric score.
        7-10 → High, 4-6 → Medium, 1-3 → Low.
        LLM-assigned band is overridden if it contradicts the score.
        """
        if self.mediatability_score >= 7:
            self.mediatability_band = MediatabilitBand.HIGH
        elif self.mediatability_score >= 4:
            self.mediatability_band = MediatabilitBand.MEDIUM
        else:
            self.mediatability_band = MediatabilitBand.LOW
        return self


# ──────────────────────────────────────────────────────────────────────────────
# PIPELINE WRAPPER — Full Burst 1 Output
# Used by Celery to store the complete Burst 1 result in ai_analysis table.
# ──────────────────────────────────────────────────────────────────────────────

class Burst1Output(BaseModel):
    """
    Complete output of Burst 1 pipeline.
    Stored as JSON in the ai_analysis table against the case.
    All fields except conflict_extraction are Optional — if a sub-system
    fails after retries, its field is None and the mediator is notified.
    """

    conflict_extraction: ConflictExtraction
    neutral_summary: Optional[NeutralSummary]       = None
    bias_removal: Optional[BiasRemovalOutput]        = None
    tone_analysis: Optional[ToneAnalysis]            = None
    mediatability: Optional[MediatabilitySore]       = None


class Burst2Output(BaseModel):
    """
    Complete output of Burst 2 pipeline.
    Stored in ai_analysis table after questionnaire responses are received.
    """

    questionnaire: Optional[QuestionnaireOutput]    = None
    batna_watna: Optional[BatnaWatnaOutput]         = None