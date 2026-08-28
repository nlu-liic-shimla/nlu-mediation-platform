from enum import Enum

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