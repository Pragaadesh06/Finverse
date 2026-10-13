import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { step } = useAuth();
  const location = useLocation();

  if (step === "awaiting_2fa") {
    return <Navigate to="/verify-2fa" state={{ from: location }} replace />;
  }

  if (step === "awaiting_email_verification") {
    return <Navigate to="/verify-email" state={{ from: location }} replace />;
  }

  if (step === "unauthenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
