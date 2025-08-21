// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles = [] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  if (roles.length && !user.roles?.some(r => roles.includes(r))) {
    if (import.meta.env.DEV) {
      console.warn("⛔ Bloqueado por roles", { required: roles, userRoles: user.roles });
    }
    return <Navigate to="/login" replace />;
  }
  return children;
}
