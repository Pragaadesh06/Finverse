import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const { step, user } = useAuth();
  const location = useLocation();

  if (step === "authenticated") {
    const from = (location.state as any)?.from?.pathname;
    if (from && from !== "/login" && from !== "/register") {
      return <Navigate to={from} replace />;
    }
    return <Navigate to={user?.role === "customer" ? "/customer/dashboard" : "/dashboard"} replace />;
  }

  return <>{children}</>;
};

export default PublicOnlyRoute;
