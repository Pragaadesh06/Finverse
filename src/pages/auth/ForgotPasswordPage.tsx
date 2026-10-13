import React from "react";
import { ForgotPasswordForm } from "../../components/auth/ForgotPasswordForm";
import { ThemeToggle } from "../../components/common/ThemeToggle";

export const ForgotPasswordPage: React.FC = () => {
  return (
    <div className="auth-page relative min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle size="sm" showLabel={true} />
      </div>

      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "var(--color-bg)",
          backgroundImage: `radial-gradient(circle at 15% 25%, rgba(46,125,82,0.06) 0%, transparent 55%),
                            radial-gradient(circle at 85% 75%, rgba(184,134,11,0.05) 0%, transparent 55%)`,
        }}
      />

      <div className="relative z-10 w-full">
        <ForgotPasswordForm />
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
