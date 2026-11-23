import axios from "axios";
import { getAuthToken } from "../utils/auth";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

client.interceptors.request.use((config) => {
  // Prefer sessionStorage token (invitation tab) over localStorage token (normal login)
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') 
                         || error.config?.url?.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Clear both storage scopes on hard 401
      sessionStorage.removeItem('nlu_token');
      sessionStorage.removeItem('nlu_role');
      localStorage.removeItem('nlu_token');
      localStorage.removeItem('nlu_role');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default client;