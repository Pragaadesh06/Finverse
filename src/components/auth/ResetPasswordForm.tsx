import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Eye, EyeOff, Lock, ArrowLeft, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { FinverseWordmark } from "../common/FinverseWordmark";
import { cn } from "../../lib/utils";

export const ResetPasswordForm: React.FC = () => {
  const { resetPassword, isLoading, error, clearError } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "demo_secure_reset_token";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState({ password: false, confirmPassword: false });

  const hasMinLength = password.length >= 8;
  const isMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = hasMinLength && isMatch && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ password: true, confirmPassword: true });
    if (!canSubmit) return;

    const ok = await resetPassword(token, password);
    if (ok) {
      setSuccess(true);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="flex justify-center">
        <FinverseWordmark size="xl" align="center" showTagline={true} />
      </div>

      <div className="auth-card animate-slide-up">
        {success ? (
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
              Password Reset Complete
            </h1>

            <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-2)" }}>
              Your credentials have been securely updated. You can now authenticate with your new passphrase.
            </p>

            <div className="pt-3">
              <Link
                to="/login"
                className="btn-primary w-full py-2.5 text-sm inline-flex items-center justify-center gap-2"
              >
                Sign In to Finverse
                <ArrowRight className="w-4 h-4" />
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
                Set New Passphrase
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--color-ink-2)" }}>
                Choose an institutional-strength password for your account
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
                <label className="label-caps block" htmlFor="new-password">
                  New Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "var(--color-ink-3)" }}
                  />
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    className="input-base pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors"
                    style={{ color: "var(--color-ink-3)" }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {touched.password && !hasMinLength && (
                  <p className="text-xs" style={{ color: "#A8190F" }}>
                    Password must be at least 8 characters
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="label-caps block" htmlFor="confirm-new-password">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "var(--color-ink-3)" }}
                  />
                  <input
                    id="confirm-new-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
                    onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    className="input-base pl-10"
                  />
                </div>
                {touched.confirmPassword && !isMatch && confirmPassword.length > 0 && (
                  <p className="text-xs" style={{ color: "#A8190F" }}>
                    Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "btn-primary w-full py-2.5 text-sm mt-3",
                  !canSubmit && "opacity-50 cursor-not-allowed hover:transform-none hover:shadow-none"
                )}
                id="reset-submit"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Updating Password…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Set New Password
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

export default ResetPasswordForm;
