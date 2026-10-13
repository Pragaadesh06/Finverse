import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { FinverseWordmark } from "../common/FinverseWordmark";
import { cn } from "../../lib/utils";

export const ForgotPasswordForm: React.FC = () => {
  const { requestPasswordReset, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(false);

  const isEmailValid = email.includes("@") && email.includes(".");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isEmailValid || isLoading) return;

    await requestPasswordReset(email);
    setSubmitted(true);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="flex justify-center">
        <FinverseWordmark size="xl" align="center" showTagline={true} />
      </div>

      <div className="auth-card animate-slide-up">
        {submitted ? (
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
              Reset Instructions Dispatched
            </h1>

            <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-2)" }}>
              If an analyst account matches <strong className="text-ink">{email}</strong>, a secure reset link with
              time-limited cryptographic tokens has been dispatched to your institutional inbox.
            </p>

            <div
              className="p-3 rounded-xl text-[11px] leading-relaxed text-left"
              style={{ background: "var(--color-bg-subtle)", color: "var(--color-ink-2)" }}
            >
              <span className="font-semibold text-ink">Institutional Security Notice:</span> For compliance purposes,
              reset tokens expire in 15 minutes. Check spam filters or contact security if unopened.
            </div>

            <div className="pt-3">
              <Link
                to="/login"
                className="btn-primary w-full py-2.5 text-sm inline-flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1
                className="text-xl font-bold tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "var(--color-ink)" }}
              >
                Recover Credentials
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--color-ink-2)" }}>
                Enter your institutional email to request a secure password reset link
              </p>
            </div>

            {error && (
              <div
                className="mb-4 flex items-start gap-2.5 p-3 rounded-xl text-sm animate-fade-in"
                style={{
                  background: "rgba(168, 25, 15, 0.08)",
                  border: "1px solid rgba(168, 25, 15, 0.25)",
                  color: "#A8190F",
                }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="label-caps block" htmlFor="forgot-email">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "var(--color-ink-3)" }}
                  />
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    onBlur={() => setTouched(true)}
                    placeholder="analyst@finverse.io"
                    autoComplete="email"
                    className="input-base pl-10"
                  />
                </div>
                {touched && !isEmailValid && (
                  <p className="text-xs" style={{ color: "#A8190F" }}>
                    Please enter a valid email address
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!isEmailValid || isLoading}
                className={cn(
                  "btn-primary w-full py-2.5 text-sm mt-3",
                  (!isEmailValid || isLoading) && "opacity-50 cursor-not-allowed hover:transform-none hover:shadow-none"
                )}
                id="forgot-submit"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Dispatching Link…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Send Reset Link
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>

            <div
              className="mt-6 pt-4 text-center text-xs"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <Link
                to="/login"
                className="font-semibold inline-flex items-center gap-1.5 transition-colors"
                style={{ color: "var(--color-ink-2)" }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
