import client from "./client";

export const getCases = async () => {
  const response = await client.get("/api/v1/cases/");
  return response.data;
};

export const getCaseById = async (caseId) => {
  const response = await client.get(`/api/v1/cases/${caseId}`);
  return response.data;
};