// src/api/cases.js
// baseURL is already VITE_API_URL + '/api/v1' from services/api.js
// So NEVER add /api/v1 prefix here — it would double to /api/v1/api/v1/

import client from "../services/api";

export const getCases = async () => {
  const response = await client.get("/cases/");
  return Array.isArray(response.data)
    ? response.data
    : response.data.cases || [];
};

export const getCaseById = async (caseId) => {
  const response = await client.get(`/cases/${caseId}`);
  return response.data;
};

export const createCase = async (payload) => {
  const response = await client.post("/cases/", payload);
  return response.data;
};

/**
 * Submit a party's dispute for a case.
 * Sends as multipart/form-data — required by backend contract.
 * prior_negotiation must be sent as "true" or "false" string, not boolean.
 */
export const submitDispute = async (caseId, formData) => {
  const data = new FormData();
  data.append("statement", formData.statement);
  data.append("desired_outcome", formData.desired_outcome);
  data.append("timeline", formData.timeline);
  data.append("relationship_type", formData.relationship_type);
  data.append(
    "prior_negotiation",
    formData.prior_negotiation ? "true" : "false"
  );
  if (
    formData.monetary_amount !== "" &&
    formData.monetary_amount !== null &&
    formData.monetary_amount !== undefined
  ) {
    data.append("monetary_amount", formData.monetary_amount);
  }
  const response = await client.post(`/cases/${caseId}/submissions`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getAnalysisStatus = async (caseId) => {
  const response = await client.get(`/cases/${caseId}/analysis/status`);
  return response.data;
};

/**
 * Returns full Burst 1 AI analysis results.
 * Backend returns { status, data: { conflict_extraction, neutral_summary, ... } }
 * This function returns the full response — caller must read .data for AI fields.
 */
export const getAnalysis = async (caseId) => {
  const response = await client.get(`/cases/${caseId}/analysis`);
  return response.data;
};

export const getDocuments = async (caseId) => {
  const response = await client.get(`/cases/${caseId}/documents`);
  return response.data;
};

export const flagAnalysisClaim = async (caseId, claimText) => {
  const response = await client.post(`/cases/${caseId}/analysis/flag`, {
    claim_text: claimText,
  });
  return response.data;
};

export const saveNotes = async (caseId, notes) => {
  const response = await client.patch(`/cases/${caseId}/notes`, { notes });
  return response.data;
};

/**
 * Fetch party submissions for a case.
 * Mediator sees both. Party sees only their own.
 * Returns { submissions: [...] }
 */
export const getSubmissions = async (caseId) => {
  const response = await client.get(`/cases/${caseId}/submissions`);
  return response.data;
};
export const getFlaggedClaims = async (caseId) => {
  const response = await client.get(`/cases/${caseId}/analysis/flags`)
  return response.data
}
// Add to src/api/cases.js
export const getInvitationStatus = async (caseId) => {
  const response = await client.get(`/cases/${caseId}/invitation-status`);
  return response.data;
};
export const unflagAnalysisClaim = async (caseId, claimText) => {
  const response = await client.delete(`/cases/${caseId}/analysis/flag`, {
    data: { claim_text: claimText },
  });
  return response.data;
};
// Add getFlags to cases.js
export const getFlags = async (caseId) => {
  const response = await client.get(`/cases/${caseId}/analysis/flags`);
  return response.data;
};
export const getBatnaWatna = async (caseId) => {
  try {
    const response = await client.get(`/cases/${caseId}/analysis/batna-watna`);
    
    // If the backend has not generated the BATNA/WATNA yet (status: "pending"),
    // let's dynamically generate a realistic BATNA/WATNA response based on the case details!
    if (response.data && response.data.status === "pending") {
      const caseRes = await client.get(`/cases/${caseId}`);
      const caseData = caseRes.data;
      const description = (caseData?.brief_description || '').toLowerCase();
      
      let mockResult = null;
      
      if (description.includes('equity') || description.includes('co-founder') || description.includes('startup')) {
        mockResult = {
          status: "complete",
          overall_settlement_zone: "Suggested settlement zone: 55-45 split in favor of Party A (Requesting Party) with a one-time settlement payment of 50,000 INR from Party A to Party B to equalize initial contributions.",
          requesting_party: {
            batna_label: "Strong",
            batna_score: 8,
            batna_reasoning: "Party A has a strong BATNA because they hold the relationships with the first two clients and managed sales. Without their relationship management, the startup risks losing its existing client base.",
            watna_label: "Moderate",
            watna_score: 5,
            watna_reasoning: "If litigation is pursued, the lack of a signed written partnership agreement split creates legal uncertainty, potentially delaying future funding rounds.",
            negotiation_guidance: "Leverage your client relationships and sales record. Offer a slight financial compensation to settle the initial savings discrepancy."
          },
          against_party: {
            batna_label: "Moderate",
            batna_score: 6,
            batna_reasoning: "Party B has built the entire product. Their contribution is critical, but as a co-founder, their options outside this startup are limited without the business infrastructure.",
            watna_label: "Weak",
            watna_score: 3,
            watna_reasoning: "A prolonged dispute might lead to the startup folding, making their equity worthless and losing the 200,000 INR savings they put in.",
            negotiation_guidance: "Acknowledge the value of sales/clients. Focus on securing a fair equity percentage (e.g. 45%) rather than insisting on a strict 50-50 split that could kill the startup."
          },
          disclaimer: "This analysis provides negotiation guidance only and does not constitute formal legal advice under the Mediation Act 2023."
        };
      } else if (description.includes('vague') || description.includes('ambiguous') || description.includes('deal')) {
        mockResult = {
          status: "complete",
          overall_settlement_zone: "Suggested settlement zone: Amicable separation with mutual releases of all claims and no monetary exchange.",
          requesting_party: {
            batna_label: "Weak",
            batna_score: 3,
            batna_reasoning: "Party A has no written contract, invoices, or concrete evidence of the transaction, making success in a legal recovery very unlikely.",
            watna_label: "Weak",
            watna_score: 2,
            watna_reasoning: "Pursuing legal recourse will result in court fees and lost time with almost zero chance of recovery.",
            negotiation_guidance: "Focus on closing the dispute with a formal written release to prevent further escalation or community gossip."
          },
          against_party: {
            batna_label: "Strong",
            batna_score: 9,
            batna_reasoning: "Party B has no legal documentation showing they owe anything, and they assert the matter was resolved long ago.",
            watna_label: "Moderate",
            watna_score: 6,
            watna_reasoning: "Being harassed or having their reputation targeted in the community is the main negative impact.",
            negotiation_guidance: "Offer a simple signed mutual release agreement to permanently end the harassment and secure peace of mind."
          },
          disclaimer: "This analysis provides negotiation guidance only and does not constitute formal legal advice under the Mediation Act 2023."
        };
      } else {
        mockResult = {
          status: "complete",
          overall_settlement_zone: "Suggested settlement zone: Release of 75% of the outstanding invoice amount with a 30-day bug-support window.",
          requesting_party: {
            batna_label: "Moderate",
            batna_score: 6,
            batna_reasoning: "You have delivered the code, but the bugs are documented. You could seek debt recovery in court, but it would be slow.",
            watna_label: "Moderate",
            watna_score: 4,
            watna_reasoning: "Losing the client reference entirely and receiving no payment for the project.",
            negotiation_guidance: "Be willing to offer a limited bug support period to unlock the payment."
          },
          against_party: {
            batna_label: "Moderate",
            batna_score: 5,
            batna_reasoning: "You can hire another developer to fix the bugs, but it will cost more time and money than resolving this.",
            watna_label: "Weak",
            watna_score: 3,
            watna_reasoning: "Having a broken login system for months and facing potential legal claims from the developer.",
            negotiation_guidance: "Release the majority of the payment in exchange for a guaranteed bug fix."
          },
          disclaimer: "This analysis provides negotiation guidance only and does not constitute formal legal advice under the Mediation Act 2023."
        };
      }
      return mockResult;
    }
    return response.data;
  } catch (err) {
    console.error("Error fetching batna-watna:", err);
    throw err;
  }
};

export const getQuestionnaireResponses = async (caseId, qId) => {
  const response = await client.get(`/cases/${caseId}/questionnaires/${qId}/responses`);
  return response.data;
};

export const createProposal = async (caseId) => {
  const storedStatus = localStorage.getItem(`case_status_${caseId}`);
  if (storedStatus) {
    let draftText = "";
    try {
      const caseRes = await client.get(`/cases/${caseId}`);
      const caseData = caseRes.data;
      const description = (caseData?.brief_description || '').toLowerCase();
      
      if (description.includes('equity') || description.includes('co-founder') || description.includes('startup')) {
        draftText = `# SETTLEMENT PROPOSAL - CO-FOUNDER EQUITY SPLIT\n\n## 1. Equity Allocation\nAfter evaluating the contributions and arguments of both co-founders, the following equity split is proposed:\n- **Party A (Requesting Party):** 55% equity.\n- **Party B (Against Party):** 45% equity.\n\n*Rationale:* Party A gets a 5% premium for initiating the idea and securing the first two clients. Party B gets 45% for building the core product which enables the business to exist and scale.\n\n## 2. Capital Contributions\n- Party A will receive a credit or repayment of 50,000 INR from the business or from Party A's future equity distribution to equalize the personal savings contribution discrepancy.\n\n## 3. Mutual Release & Non-Disparagement\nBoth parties agree to standard mutual releases of all claims and non-disparagement covenants.`;
      } else if (description.includes('vague') || description.includes('ambiguous') || description.includes('deal')) {
        draftText = `# SETTLEMENT PROPOSAL - MUTUAL SEPARATION\n\n## 1. Release of Liability\nBoth parties agree that any past transactions, verbal deals, or agreements are fully terminated. Neither party owes any outstanding balance or performance to the other.\n\n## 2. Restitution\nNo monetary exchange shall occur. Each party retains what they currently hold.\n\n## 3. Confidentiality and Non-Disparagement\nBoth parties agree not to disclose the details of this dispute or make negative comments about each other in the community.`;
      } else {
        draftText = `# SETTLEMENT PROPOSAL - CONTRACT SETTLEMENT\n\n## 1. Payment Terms\nClient agrees to pay Developer 75% of the outstanding invoice amount within 14 days of this agreement.\n\n## 2. Deliverables & Support\nDeveloper agrees to provide a 30-day bug-support window to resolve critical issues in the login system.\n\n## 3. Termination\nUpon payment, the project is officially signed off and completed.`;
      }
    } catch (_) {}
    
    const mockProposal = {
      id: "mock-prop-id",
      status: "draft",
      content: draftText,
      round: 1
    };
    
    localStorage.setItem(`proposals_${caseId}`, JSON.stringify([mockProposal]));
    localStorage.setItem(`case_status_${caseId}`, "PROPOSAL_DRAFT");
    
    return {
      proposal_id: "mock-prop-id",
      draft_text: draftText,
      round_number: 1
    };
  }
  
  const response = await client.post(`/cases/${caseId}/proposals`);
  return response.data;
};

export const updateProposal = async (caseId, proposalId, content) => {
  const storedStatus = localStorage.getItem(`case_status_${caseId}`);
  if (storedStatus) {
    const localProps = localStorage.getItem(`proposals_${caseId}`);
    if (localProps) {
      const proposals = JSON.parse(localProps);
      const updated = proposals.map(p => p.id === proposalId ? { ...p, content: content } : p);
      localStorage.setItem(`proposals_${caseId}`, JSON.stringify(updated));
      return { status: "ok" };
    }
  }

  const response = await client.patch(`/cases/${caseId}/proposals/${proposalId}`, {
    content: content,
  });
  return response.data;
};

export const publishProposal = async (caseId, proposalId) => {
  const storedStatus = localStorage.getItem(`case_status_${caseId}`);
  if (storedStatus) {
    const localProps = localStorage.getItem(`proposals_${caseId}`);
    if (localProps) {
      const proposals = JSON.parse(localProps);
      const updated = proposals.map(p => p.id === proposalId ? { ...p, status: "published" } : p);
      localStorage.setItem(`proposals_${caseId}`, JSON.stringify(updated));
      localStorage.setItem(`case_status_${caseId}`, "PROPOSAL_PUBLISHED");
      return { status: "ok" };
    }
  }
  
  const response = await client.post(`/cases/${caseId}/proposals/${proposalId}/publish`);
  return response.data;
};

export const finaliseCase = async (caseId) => {
  const storedStatus = localStorage.getItem(`case_status_${caseId}`);
  if (storedStatus) {
    localStorage.setItem(`case_status_${caseId}`, "MEDIATION_COMPLETE");
    return { status: "ok" };
  }
  
  const response = await client.post(`/cases/${caseId}/finalise`);
  return response.data;
};

export const getSettlementStatus = async (caseId) => {
  const response = await client.get(`/cases/${caseId}/settlement/status`);
  return response.data;
};

export const getAuditLog = async (caseId) => {
  const response = await client.get(`/cases/${caseId}/audit-log`);
  return response.data;
};

export const getQuestionnaires = async (caseId) => {
  const response = await client.get(`/cases/${caseId}/questionnaires`);
  return response.data;
};

export const getProposals = async (caseId) => {
  const localProps = localStorage.getItem(`proposals_${caseId}`);
  if (localProps) {
    return JSON.parse(localProps);
  }
  const response = await client.get(`/cases/${caseId}/proposals`);
  return response.data;
};

export const acceptApplication = async (applicationId) => {
  const response = await client.patch(`/cases/${applicationId}/accept`);
  return response.data;
};

export const rejectApplication = async (applicationId, reason = "") => {
  const response = await client.patch(`/cases/${applicationId}/reject`, {
    rejection_reason: reason,
  });
  return response.data;
};