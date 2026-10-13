import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ShieldCheck, AlertCircle, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import { FinverseWordmark } from "../common/FinverseWordmark";
import { cn } from "../../lib/utils";

const OTP_LENGTH = 6;

function SegmentedOtpInput({
  value,
  onChange,
  disabled,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
  error: boolean;
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (index: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1);
    const next = value.split("");
    next[index] = digit;
    const updated = next.join("").slice(0, OTP_LENGTH);
    onChange(updated);

    if (digit && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!value[index] && index > 0) {
        const next = value.split("");
        next[index - 1] = "";
        onChange(next.join(""));
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    onChange(pasted);
    const nextFocus = Math.min(pasted.length, OTP_LENGTH - 1);
    inputsRef.current[nextFocus]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2.5" onPaste={handlePaste}>
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          id={`otp-digit-${i}`}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            "w-11 text-center text-lg font-bold rounded-xl transition-all duration-200",
            "focus:outline-none focus:ring-2",
            error
              ? "border-2 border-red-400 bg-red-50 focus:ring-red-300"
              : value[i]
              ? "border-2 focus:ring-2"
              : "border focus:ring-2",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{
            height: "3.25rem",
            background: "var(--color-bg-card)",
            color: "var(--color-ink)",
            borderColor: error
              ? "rgba(168,25,15,0.5)"
              : value[i]
              ? "var(--color-accent-2)"
              : "var(--color-border)",
            "--tw-ring-color": error ? "rgba(168,25,15,0.2)" : "rgba(46,125,82,0.2)",
            boxShadow: value[i] && !error ? "0 0 0 3px rgba(46,125,82,0.12)" : undefined,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export const TwoFactorVerificationForm: React.FC = () => {
  const { verify2FA, resend2FA, logout, isLoading, error, clearError, pendingEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleCodeChange = useCallback(
    (val: string) => {
      setCode(val);
      if (error) clearError();
    },
    [error, clearError]
  );

  const handleResend = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setResendSuccess(false);
    const ok = await resend2FA();
    if (ok) {
      setResendSuccess(true);
      setResendCooldown(60);
      cooldownRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === OTP_LENGTH && !isLoading) {
      const ok = await verify2FA(code);
      if (ok) {
        const from = (location.state as any)?.from?.pathname;
        if (from && from !== "/login" && from !== "/verify-2fa" && from !== "/verify") {
          navigate(from, { replace: true });
        } else {
          // Check role from session storage
          let isCustomer = false;
          try {
            const stored = localStorage.getItem("finverse_session_user");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed?.user?.role === "customer") isCustomer = true;
            }
          } catch {}
          navigate(isCustomer ? "/customer/dashboard" : "/dashboard", { replace: true });
        }
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="flex justify-center">
        <FinverseWordmark size="xl" align="center" showTagline={true} />
      </div>

      <div className="auth-card animate-slide-up">
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
            style={{ background: "var(--color-accent-muted)", border: "1px solid rgba(46,125,82,0.20)" }}
          >
            <ShieldCheck className="w-6 h-6" style={{ color: "var(--color-accent-2)" }} />
          </div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "var(--color-ink)" }}
          >
            Two-Factor Verification
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-ink-2)" }}>
            Enter the 6-digit verification code from your authenticator device
            {pendingEmail ? <> for <strong className="text-ink">{pendingEmail}</strong></> : null}
          </p>
        </div>

        {/* Demo mode helper notice */}
        <div
          className="mb-4 p-3 rounded-xl text-xs text-center"
          style={{
            background: "var(--color-gold-muted)",
            border: "1px solid rgba(184,134,11,0.25)",
            color: "var(--color-gold)",
          }}
        >
          <strong>Demo environment:</strong> Enter any 6 digits or use{" "}
          <code className="font-mono font-bold">000000</code> or <code className="font-mono font-bold">246810</code>
        </div>

        {error && (
          <div
            className="mb-4 flex items-start gap-2.5 p-3 rounded-xl text-sm animate-fade-in"
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

        {resendSuccess && !error && (
          <div
            className="mb-4 flex items-center gap-2.5 p-3 rounded-xl text-sm animate-fade-in"
            style={{
              background: "var(--color-accent-muted)",
              border: "1px solid rgba(46,125,82,0.25)",
              color: "var(--color-accent)",
            }}
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>A fresh verification code has been dispatched.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <SegmentedOtpInput
            value={code}
            onChange={handleCodeChange}
            disabled={isLoading}
            error={!!error}
          />

          <button
            type="submit"
            disabled={code.length < OTP_LENGTH || isLoading}
            className={cn(
              "btn-primary w-full py-2.5 text-sm",
              (code.length < OTP_LENGTH || isLoading) &&
                "opacity-50 cursor-not-allowed hover:transform-none hover:shadow-none"
            )}
            id="verify-2fa-submit"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying Credentials…
              </span>
            ) : (
              "Verify & Proceed to Dashboard"
            )}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 font-medium transition-colors hover:underline"
            style={{ color: "var(--color-ink-2)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to login
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || isLoading}
            className={cn(
              "flex items-center gap-1.5 font-semibold transition-colors",
              resendCooldown > 0 ? "opacity-50 cursor-not-allowed" : "hover:underline"
            )}
            style={{ color: "var(--color-gold)" }}
            id="resend-2fa-btn"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
          </button>
        </div>
      </div>

      <p className="text-center text-xs" style={{ color: "var(--color-ink-3)" }}>
        TOTP Multi-Factor Authentication · Institutional Session Protocol
      </p>
    </div>
  );
};

export default TwoFactorVerificationForm;
