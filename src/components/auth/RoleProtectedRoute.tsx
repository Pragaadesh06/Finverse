import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AccessDeniedPage from "../../pages/AccessDeniedPage";

export interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: readonly string[] | string[];
  fallbackUrl?: string;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles,
  fallbackUrl,
}) => {
  const { user, step } = useAuth();
  const location = useLocation();

  if (step === "awaiting_2fa") {
    return <Navigate to="/verify-2fa" state={{ from: location }} replace />;
  }

  if (step === "awaiting_email_verification") {
    return <Navigate to="/verify-email" state={{ from: location }} replace />;
  }

  if (step === "unauthenticated" || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = (user.role || "customer").toLowerCase();
  const isAllowed = allowedRoles.map((r) => r.toLowerCase()).includes(userRole);

  if (!isAllowed) {
    if (fallbackUrl) {
      return <Navigate to={fallbackUrl} replace />;
    }
    // Show refined Access Denied page when unauthorized
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
