import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const getInvitation = async (token) => {
  const response = await axios.get(`${BASE}/api/v1/invitations/${token}`);
  return response.data;
};

export const acceptInvitation = async (token, email, password) => {
  const response = await axios.post(
    `${BASE}/api/v1/invitations/${token}/accept`,
    { email, password }
  );
  return response.data;
};