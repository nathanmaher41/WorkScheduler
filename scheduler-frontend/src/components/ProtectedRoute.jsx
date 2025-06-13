import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function isTokenValid(token) {
  if (!token) return false;

  try {
    const { exp } = jwtDecode(token);
    return Date.now() < exp * 1000;
  } catch (e) {
    return false;
  }
}

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access");

  return isTokenValid(token) ? children : <Navigate to="/login" replace />;
}
