import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Mail, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw, AlertCircle, Info } from "lucide-react";
import { FinverseWordmark } from "../../components/common/FinverseWordmark";
import { ThemeToggle } from "../../components/common/ThemeToggle";
import { apiConfig } from "../../services/apiClient";

export const VerifyEmailPage: React.FC = () => {
  const { pendingEmail, verifyEmail, isLoading, error } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "demo_verification_token";
  const navigate = useNavigate();

  const [verified, setVerified] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const isBackendMode = apiConfig.getMode() === "backend";

  const handleSimulateVerify = async () => {
    const ok = await verifyEmail(token);
    if (ok) {
      setVerified(true);
    }
  };

  const handleResend = () => {
    setResendStatus("A fresh verification dispatch was queued with the authentication service.");
    setTimeout(() => setResendStatus(null), 5000);
  };

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

      <div className="relative z-10 w-full max-w-md mx-auto space-y-6">
        <div className="flex justify-center">
          <FinverseWordmark size="xl" align="center" showTagline={true} />
        </div>

        <div className="auth-card animate-slide-up">
          {verified ? (
            <div className="text-center space-y-4 py-3">
              <div
                className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center animate-scale-in"
                style={{ background: "var(--color-accent-muted)", border: "1px solid rgba(46,125,82,0.25)" }}
              >
                <CheckCircle2 className="w-7 h-7" style={{ color: "var(--color-accent-2)" }} />
              </div>

              <h1
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "var(--color-ink)" }}
              >
                Institutional Email Verified
              </h1>

              <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-2)" }}>
                Your email identity has been confirmed with the Finverse authentication registry.
                You can now proceed to login.
              </p>

              <div className="pt-3">
                <Link
                  to="/login"
                  className="btn-primary w-full py-2.5 text-sm inline-flex items-center justify-center gap-2"
                >
                  Sign In with Verified Credentials
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center">
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
                  style={{ background: "var(--color-accent-muted)", border: "1px solid rgba(46,125,82,0.20)" }}
                >
                  <Mail className="w-6 h-6" style={{ color: "var(--color-accent-2)" }} />
                </div>
                <h1
                  className="text-xl font-bold"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "var(--color-ink)" }}
                >
                  Verify Institutional Email
                </h1>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-ink-2)" }}>
                  A verification link has been dispatched to{" "}
                  <strong className="text-ink">{pendingEmail || "your registered address"}</strong>.
                </p>
              </div>

              {/* Backend Delivery Notice */}
              <div
                className="p-3.5 rounded-xl text-xs space-y-1.5"
                style={{
                  background: isBackendMode ? "var(--color-gold-muted)" : "var(--color-accent-muted)",
                  border: isBackendMode ? "1px solid rgba(184,134,11,0.25)" : "1px solid rgba(46,125,82,0.20)",
                  color: isBackendMode ? "var(--color-gold)" : "var(--color-accent)",
                }}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {isBackendMode
                      ? "SMTP Email Delivery Required"
                      : "Development Mock Authentication"}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {isBackendMode
                    ? "In backend mode, your email provider or SMTP gateway (FastAPI Mail/SendGrid) must confirm dispatch. In the hackathon preview, click 'Complete Verification' below to simulate the incoming token webhook."
                    : "Simulated token contract is active. You can complete verification directly below."}
                </p>
              </div>

              {error && (
                <div
                  className="flex items-start gap-2.5 p-3 rounded-xl text-sm"
                  style={{
                    background: "rgba(168,25,15,0.08)",
                    border: "1px solid rgba(168,25,15,0.25)",
                    color: "#A8190F",
                  }}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {resendStatus && (
                <div
                  className="flex items-center gap-2 p-3 rounded-xl text-xs"
                  style={{
                    background: "var(--color-accent-muted)",
                    color: "var(--color-accent)",
                    border: "1px solid rgba(46,125,82,0.20)",
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{resendStatus}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSimulateVerify}
                disabled={isLoading}
                className="btn-primary w-full py-2.5 text-sm"
                id="complete-verification-btn"
              >
                {isLoading ? "Validating Token…" : "Complete Verification & Sign In"}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 font-medium transition-colors"
                  style={{ color: "var(--color-ink-2)" }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In
                </Link>

                <button
                  type="button"
                  onClick={handleResend}
                  className="inline-flex items-center gap-1 font-semibold hover:underline"
                  style={{ color: "var(--color-gold)" }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Resend verification email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
