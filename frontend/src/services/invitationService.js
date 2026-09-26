import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const getInvitation = async (token) => {
  const response = await axios.get(`${BASE}/api/v1/invitations/${token}`);
  return response.data;
};

export const acceptInvitation = async (token, email, password, fullName = null) => {
  const response = await axios.post(
    `${BASE}/api/v1/invitations/${token}/accept`,
    { email, password, full_name: fullName }
  )
  return response.data
}

export const declineInvitation = async (token, reason = null) => {
  const response = await axios.post(
    `${BASE}/api/v1/invitations/${token}/decline`,
    { reason }
  )
  return response.data
}