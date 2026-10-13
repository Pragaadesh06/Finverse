import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authService, UserProfile } from "../services/authService";

export type AuthUser = UserProfile;

export type AuthStep =
  | "unauthenticated"
  | "awaiting_2fa"
  | "awaiting_email_verification"
  | "authenticated";

interface AuthContextValue {
  user: AuthUser | null;
  step: AuthStep;
  isLoading: boolean;
  error: string | null;
  pendingEmail: string;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  verify2FA: (code: string) => Promise<boolean>;
  resend2FA: () => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resetPassword: (token: string, newPassword: string) => Promise<boolean>;
  verifyEmail: (token: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const STORAGE_KEY = "finverse_session_user";

const AuthContext = createContext<AuthContextValue>({
  user: null,
  step: "unauthenticated",
  isLoading: false,
  error: null,
  pendingEmail: "",
  login: async () => false,
  register: async () => false,
  verify2FA: async () => false,
  resend2FA: async () => false,
  requestPasswordReset: async () => false,
  resetPassword: async () => false,
  verifyEmail: async () => false,
  logout: () => {},
  clearError: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [step, setStep] = useState<AuthStep>("unauthenticated");
  const [pendingEmail, setPendingEmail] = useState<string>("");
  const [pendingChallengeId, setPendingChallengeId] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Restore session: check backend /me first, fallback to cached user profile
  useEffect(() => {
    async function restoreSession() {
      try {
        const backendUser = await authService.getCurrentUser();
        if (backendUser) {
          setUser(backendUser);
          setStep("authenticated");
          setInitialized(true);
          return;
        }

        // Check if there is an active local demo session
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.user && parsed?.expiresAt > Date.now()) {
            setUser(parsed.user);
            setStep("authenticated");
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setInitialized(true);
      }
    }
    restoreSession();
  }, []);

  const persistSession = (u: AuthUser) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: u, expiresAt: Date.now() + 8 * 60 * 60 * 1000 })
      );
    } catch {}
  };

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setPendingEmail(email);
    try {
      const res = await authService.login(email, password);

      if (res.status === "requires_2fa") {
        if (res.challenge_id) setPendingChallengeId(res.challenge_id);
        setStep("awaiting_2fa");
        return false;
      }

      if (res.status === "requires_email_verification") {
        setStep("awaiting_email_verification");
        return false;
      }

      if (res.status === "authenticated" && res.user) {
        setUser(res.user);
        persistSession(res.user);
        setStep("authenticated");
        return true;
      }

      throw new Error("Unable to complete authentication.");
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      setPendingEmail(email);
      try {
        const res = await authService.register({ name, email, password });
        if (res.challenge_id) setPendingChallengeId(res.challenge_id);
        if (res.requiresEmailVerification) {
          setStep("awaiting_email_verification");
        }
        return true;
      } catch (err: any) {
        setError(err?.message || "Registration failed.");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const verify2FA = useCallback(
    async (code: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authService.verify2FA(code, pendingEmail, pendingChallengeId);
        if (res.success && res.user) {
          setUser(res.user);
          persistSession(res.user);
          setStep("authenticated");
          return true;
        }
        throw new Error(res.message || "Verification failed.");
      } catch (err: any) {
        setError(err?.message || "Invalid verification code.");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [pendingEmail, pendingChallengeId]
  );

  const resend2FA = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.resend2FA(pendingChallengeId, pendingEmail);
      return true;
    } catch (err: any) {
      setError(err?.message || "Could not resend verification code.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.requestPasswordReset(email);
      return true;
    } catch (err: any) {
      setError(err?.message || "Unable to send password reset request.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(
    async (token: string, newPassword: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await authService.resetPassword({ token, newPassword });
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to reset password.");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const verifyEmail = useCallback(async (token: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.verifyEmail(token);
      return true;
    } catch (err: any) {
      setError(err?.message || "Email verification failed.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setPendingEmail("");
    setStep("unauthenticated");
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const clearError = useCallback(() => setError(null), []);

  if (!initialized) return null;

  return (
    <AuthContext.Provider
      value={{
        user,
        step,
        isLoading,
        error,
        pendingEmail,
        login,
        register,
        verify2FA,
        resend2FA,
        requestPasswordReset,
        resetPassword,
        verifyEmail,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
