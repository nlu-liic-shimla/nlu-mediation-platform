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
  const response = await client.get(`/cases/${caseId}/analysis/batna-watna`);
  return response.data;
};
export const getQuestionnaireResponses = async (caseId, qId) => {
  const response = await client.get(`/cases/${caseId}/questionnaires/${qId}/responses`);
  return response.data;
};

export const createProposal = async (caseId) => {
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
  const response = await client.post(`/cases/${caseId}/proposals/${proposalId}/publish`);
  return response.data;
};

export const finaliseCase = async (caseId) => {
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