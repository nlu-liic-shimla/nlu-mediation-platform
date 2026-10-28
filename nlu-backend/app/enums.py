from enum import Enum

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