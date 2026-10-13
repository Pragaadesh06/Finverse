import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2, Shield, User, Mail, Lock } from "lucide-react";
import { FinverseWordmark } from "../common/FinverseWordmark";
import { cn } from "../../lib/utils";

export const RegisterForm: React.FC = () => {
  const { register, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  // Password strength scoring
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const strengthScore = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;

  const isEmailValid = email.includes("@") && email.includes(".");
  const isNameValid = name.trim().length >= 2;
  const isPasswordMatch = password.length > 0 && password === confirmPassword;
  const canSubmit =
    isNameValid &&
    isEmailValid &&
    hasMinLength &&
    isPasswordMatch &&
    acceptTerms &&
    !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    if (!canSubmit) return;

    const ok = await register(name, email, password);
    if (ok) {
      navigate("/verify-email", { replace: true });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="flex justify-center">
        <FinverseWordmark size="xl" align="center" showTagline={true} />
      </div>

      <div className="auth-card animate-slide-up">
        <div className="mb-6">
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "var(--color-ink)" }}
          >
            Create Analyst Account
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-ink-2)" }}>
            Request access to the institutional risk orchestration workspace
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
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="label-caps block" htmlFor="reg-name">
              Full Legal Name
            </label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: "var(--color-ink-3)" }}
              />
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); clearError(); }}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                placeholder="Eleanor Vance"
                autoComplete="name"
                className="input-base pl-10"
              />
            </div>
          </div>

          {/* Business Email */}
          <div className="space-y-1.5">
            <label className="label-caps block" htmlFor="reg-email">
              Institutional Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: "var(--color-ink-3)" }}
              />
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="e.vance@institution.com"
                autoComplete="email"
                className="input-base pl-10"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="label-caps block" htmlFor="reg-password">
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: "var(--color-ink-3)" }}
              />
              <input
                id="reg-password"
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

            {/* Password strength meter */}
            {password.length > 0 && (
              <div className="pt-1.5 space-y-1.5">
                <div className="flex gap-1 h-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-full transition-all duration-300"
                      style={{
                        background:
                          i <= strengthScore
                            ? strengthScore >= 3
                              ? "var(--color-accent-2)"
                              : strengthScore === 2
                              ? "var(--color-gold)"
                              : "#A8190F"
                            : "var(--color-border)",
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px]" style={{ color: "var(--color-ink-3)" }}>
                  <span>Strength: {strengthScore >= 3 ? "Institutional Strong" : strengthScore === 2 ? "Moderate" : "Weak"}</span>
                  <span className="font-mono">8+ chars, uppercase, number</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="label-caps block" htmlFor="reg-confirm-password">
              Confirm Password
            </label>
            <div className="relative">
              <Shield
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: "var(--color-ink-3)" }}
              />
              <input
                id="reg-confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
                onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className="input-base pl-10"
                style={{
                  borderColor:
                    touched.confirmPassword && !isPasswordMatch && confirmPassword.length > 0
                      ? "rgba(168,25,15,0.5)"
                      : undefined,
                }}
              />
            </div>
            {touched.confirmPassword && !isPasswordMatch && confirmPassword.length > 0 && (
              <p className="text-xs" style={{ color: "#A8190F" }}>
                Passwords do not match
              </p>
            )}
          </div>

          {/* Terms checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-800 focus:ring-emerald-700"
              />
              <span className="text-xs leading-relaxed" style={{ color: "var(--color-ink-2)" }}>
                I agree to the <span className="font-semibold text-ink">Institutional Terms of Service</span> and{" "}
                <span className="font-semibold text-ink">Finverse Data Confidentiality Governance</span>.
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "btn-primary w-full py-2.5 text-sm mt-3",
              !canSubmit && "opacity-50 cursor-not-allowed hover:transform-none hover:shadow-none"
            )}
            id="register-submit"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating Account…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Register Analyst Account
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>

        <div
          className="mt-6 pt-4 text-center text-xs"
          style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-ink-2)" }}
        >
          Already registered?{" "}
          <Link
            to="/login"
            className="font-semibold hover:underline"
            style={{ color: "var(--color-accent-2)" }}
          >
            Sign In with Existing Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
