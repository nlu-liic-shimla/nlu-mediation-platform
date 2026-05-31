import client from "./client";

export const getCases = async () => {
  const response = await client.get("/api/v1/cases/");
  return response.data;
};

export const getCaseById = async (caseId) => {
  const response = await client.get(`/api/v1/cases/${caseId}`);
  return response.data;
};

export const createCase = async (payload) => {
  const response = await client.post("/api/v1/cases/", payload);
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
  data.append("prior_negotiation", formData.prior_negotiation ? "true" : "false");
  if (formData.monetary_amount !== "" && formData.monetary_amount !== null) {
    data.append("monetary_amount", formData.monetary_amount);
  }

  const response = await client.post(
    `/api/v1/cases/${caseId}/submissions`,
    data,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
};