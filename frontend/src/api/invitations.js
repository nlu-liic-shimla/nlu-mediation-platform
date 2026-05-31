import client from "./client";
import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Get invitation preview — unauthenticated, no JWT needed.
 */
export const getInvitation = async (token) => {
  const response = await axios.get(
    `${BASE}/api/v1/invitations/${token}`
  );
  return response.data;
};

/**
 * Accept an invitation — unauthenticated.
 * Creates account if email doesn't exist, links if it does.
 * Returns JWT scoped to the case.
 */
export const acceptInvitation = async (token, email, password) => {
  const response = await axios.post(
    `${BASE}/api/v1/invitations/${token}/accept`,
    { email, password }
  );
  return response.data;
};