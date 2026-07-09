import { Navigate } from "react-router-dom";

// Blocks users whose role doesn't match the allowed list
// Always returns 403-style redirect, never 404 — matches backend security model
export default function RoleBasedRoute({ children, allowedRoles }) {
  const role = localStorage.getItem("nlu_role");

  if (!role || !allowedRoles.includes(role)) {
    // Redirect to their correct dashboard instead of login
    if (role === "mediator") return <Navigate to="/mediator" replace />;
    if (["party_user", "requesting_party", "against_party"].includes(role))
      return <Navigate to="/party" replace />;
    return <Navigate to="/auth/login" replace />;
  }

  return children;
}
