import client from "./client";

export const login = async (email, password) => {
  const response = await client.post("/api/v1/auth/login", { email, password });
  const { access_token } = response.data;

  // Role is inside the JWT — decode it
  const payload = JSON.parse(atob(access_token.split(".")[1]));

  localStorage.setItem("nlu_token", access_token);
  localStorage.setItem("nlu_role", payload.role);
  localStorage.setItem("nlu_user", JSON.stringify({
    user_id: payload.sub,
    email: payload.email,
    role: payload.role,
  }));

  return payload.role;
};

export const register = async (email, password, role) => {
  const response = await client.post("/api/v1/auth/register", { email, password, role });
  return response.data;
};