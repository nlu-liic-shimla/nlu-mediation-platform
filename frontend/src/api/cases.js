import client from "../services/api";

export const getCases = async () => {
  const response = await client.get("/api/v1/cases/");
  return Array.isArray(response.data) ? response.data : response.data.cases || [];
};

export const getCaseById = async (caseId) => {
  const response = await client.get(`/api/v1/cases/${caseId}`);
  return response.data;
};

export const getAnalysisStatus = async (caseId) => {
  const response = await client.get(`/api/v1/cases/${caseId}/analysis/status`);
  return response.data;
};