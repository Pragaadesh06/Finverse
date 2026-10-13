import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export const AccessDeniedPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isCustomer = user?.role === "customer";
  const homePath = isCustomer ? "/customer/dashboard" : "/dashboard";

  return (
    <div className="min-h-screen bg-[#F7F4EC] dark:bg-[#102A23] flex items-center justify-center p-6 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-[#193C32] rounded-2xl border border-[#DCD8CE] dark:border-[#24483C] p-8 shadow-xl text-center">
        <div className="w-16 h-16 rounded-full bg-[#873C43]/10 dark:bg-[#873C43]/25 border border-[#873C43]/20 flex items-center justify-center mx-auto mb-6 text-[#873C43]">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="text-xs font-semibold tracking-wider uppercase text-[#873C43] bg-[#873C43]/10 px-3 py-1 rounded-full">
          Access Restricted
        </span>

        <h1 className="font-serif text-3xl font-semibold text-[#242923] dark:text-[#F7F4EC] mt-4 mb-2">
          Privileged Resource
        </h1>

        <p className="text-sm text-[#5A6356] dark:text-[#DCD8CE] leading-relaxed mb-6 font-sans">
          This workspace is reserved for authorized institutional personnel. Your current account role (
          <span className="font-semibold text-[#193C32] dark:text-[#EEE8DA]">
            {user?.role ? user.role.replace("_", " ").toUpperCase() : "STANDARD"}
          </span>
          ) does not hold authorization credentials for this record or service.
        </p>

        <div className="p-3.5 rounded-xl bg-[#EEE8DA]/50 dark:bg-[#102A23]/60 border border-[#DCD8CE] dark:border-[#24483C] text-xs text-[#5A6356] dark:text-[#DCD8CE] text-left mb-6 font-mono">
          <div><strong className="text-[#242923] dark:text-[#F7F4EC]">Policy:</strong> RBAC Deny-by-Default</div>
          <div><strong className="text-[#242923] dark:text-[#F7F4EC]">Audit:</strong> Insufficient clearance level</div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-[#DCD8CE] dark:border-[#24483C] text-xs font-medium text-[#242923] dark:text-[#F7F4EC] hover:bg-[#EEE8DA]/60 dark:hover:bg-[#102A23] transition flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous Page
          </button>
          <Link
            to={homePath}
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-[#193C32] dark:bg-[#EEE8DA] text-white dark:text-[#102A23] text-xs font-medium hover:bg-[#102A23] dark:hover:bg-white transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Home className="w-4 h-4" />
            My Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
