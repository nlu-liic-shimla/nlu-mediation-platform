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