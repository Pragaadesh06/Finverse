import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight, Lock, Mail } from "lucide-react";
import { FinverseWordmark } from "../common/FinverseWordmark";
import { cn } from "../../lib/utils";

export const LoginForm: React.FC = () => {
  const { login, isLoading, error, clearError, step, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  useEffect(() => {
    if (error) clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  useEffect(() => {
    if (step === "awaiting_2fa") {
      navigate("/verify-2fa", { state: location.state });
    } else if (step === "awaiting_email_verification") {
      navigate("/verify-email", { state: location.state });
    } else if (step === "authenticated" && user) {
      const from = (location.state as any)?.from?.pathname;
      if (from && from !== "/login" && from !== "/verify-2fa") {
        navigate(from, { replace: true });
      } else {
        navigate(user.role === "customer" ? "/customer/dashboard" : "/dashboard", { replace: true });
      }
    }
  }, [step, user, navigate, location.state]);

  const isEmailValid = email.includes("@") && email.includes(".");
  const isPasswordValid = password.length >= 4;
  const canSubmit = isEmailValid && isPasswordValid && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!canSubmit) return;

    await login(email, password);
  };

  const fillDemo = (type: "customer" | "analyst" | "admin") => {
    if (type === "customer") {
      setEmail("customer@finverse.io");
      setPassword("demo");
    } else if (type === "analyst") {
      setEmail("analyst@finverse.io");
      setPassword("demo");
    } else {
      setEmail("demo@finverse.io");
      setPassword("demo");
    }
    clearError();
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
            Analyst Sign In
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-ink-2)" }}>
            Access the financial risk orchestration console
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
            <label className="label-caps block" htmlFor="login-email">
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: "var(--color-ink-3)" }}
              />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="analyst@finverse.io"
                autoComplete="email"
                className="input-base pl-10"
                style={{
                  borderColor:
                    touched.email && !isEmailValid && email.length > 0
                      ? "rgba(168,25,15,0.5)"
                      : undefined,
                }}
              />
            </div>
            {touched.email && !isEmailValid && email.length > 0 && (
              <p className="text-xs" style={{ color: "#A8190F" }}>
                Please enter a valid business email address
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="label-caps block" htmlFor="login-password">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold hover:underline"
                style={{ color: "var(--color-gold)" }}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: "var(--color-ink-3)" }}
              />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder="••••••••••••"
                autoComplete="current-password"
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
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-800 focus:ring-emerald-700"
              />
              <span className="text-xs" style={{ color: "var(--color-ink-2)" }}>
                Remember session
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "btn-primary w-full py-2.5 text-sm mt-3",
              !canSubmit && "opacity-50 cursor-not-allowed hover:transform-none hover:shadow-none"
            )}
            id="login-submit"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Authenticating…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Sign In
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>

        <div className="divider-label mt-6">Quick Demo Access</div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => fillDemo("customer")}
            className="btn-secondary text-xs py-2 px-1 text-center justify-center"
            id="demo-customer-btn"
          >
            Client (ACC-5120)
          </button>
          <button
            type="button"
            onClick={() => fillDemo("analyst")}
            className="btn-secondary text-xs py-2 px-1 text-center justify-center"
            id="demo-analyst-btn"
          >
            Senior Analyst
          </button>
          <button
            type="button"
            onClick={() => fillDemo("admin")}
            className="btn-secondary text-xs py-2 px-1 text-center justify-center"
            id="demo-admin-btn"
          >
            Demo Analyst
          </button>
        </div>

        <div
          className="mt-6 pt-4 text-center text-xs"
          style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-ink-2)" }}
        >
          Need access credentials?{" "}
          <Link
            to="/register"
            className="font-semibold hover:underline"
            style={{ color: "var(--color-accent-2)" }}
          >
            Create an Analyst Account
          </Link>
        </div>
      </div>

      <p className="text-center text-xs" style={{ color: "var(--color-ink-3)" }}>
        Finverse Orchestration Engine · Institutional Grade Security
      </p>
    </div>
  );
};

export default LoginForm;
