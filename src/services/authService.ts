import { apiClient, apiConfig, ApiError } from "./apiClient";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "customer" | "analyst" | "senior_analyst" | "compliance_officer" | "admin" | string;
  initials: string;
  avatarColor: string;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  customerAccountId?: string;
  customer_account_id?: string;
  organizationId?: string;
  createdAt: string;
}

export type AuthStatus =
  | "authenticated"
  | "requires_2fa"
  | "requires_email_verification"
  | "unauthenticated";

export interface LoginResponse {
  status: AuthStatus;
  message: string;
  user?: UserProfile;
  twoFactorRequired?: boolean;
  emailVerificationRequired?: boolean;
  tempSessionId?: string; // transient in-memory challenge id
  challenge_id?: number;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  requiresEmailVerification: boolean;
  challenge_id?: number;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  development_note?: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
}

export interface TwoFactorVerifyResponse {
  success: boolean;
  message: string;
  user?: UserProfile;
}

// ── Mock Auth Store for Offline Fallback ─────────────────────────────────────
const MOCK_ACCOUNTS: Array<{
  email: string;
  password: string;
  user: UserProfile;
  mockOtp: string;
}> = [
  {
    email: "analyst@finverse.io",
    password: "Finverse@2025",
    mockOtp: "246810",
    user: {
      id: "usr_001",
      name: "Sarah Chen",
      email: "analyst@finverse.io",
      role: "senior_analyst",
      initials: "SC",
      avatarColor: "#2E7D52",
      isEmailVerified: true,
      twoFactorEnabled: true,
      createdAt: "2025-01-15T09:00:00Z",
    },
  },
  {
    email: "admin@finverse.io",
    password: "Admin@2025",
    mockOtp: "135790",
    user: {
      id: "usr_002",
      name: "Arjun Sharma",
      email: "admin@finverse.io",
      role: "admin",
      initials: "AS",
      avatarColor: "#B8860B",
      isEmailVerified: true,
      twoFactorEnabled: true,
      createdAt: "2024-11-20T10:30:00Z",
    },
  },
  {
    email: "demo@finverse.io",
    password: "demo",
    mockOtp: "000000",
    user: {
      id: "usr_003",
      name: "Demo Analyst",
      email: "demo@finverse.io",
      role: "analyst",
      initials: "DA",
      avatarColor: "#5D9B78",
      isEmailVerified: true,
      twoFactorEnabled: false,
      createdAt: "2025-02-01T14:15:00Z",
    },
  },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUser(raw: any): UserProfile {
  if (!raw) {
    throw new Error("Empty user payload received");
  }
  const initials =
    raw.initials ||
    (raw.name || raw.full_name || "FA")
      .split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return {
    id: String(raw.id || "usr_unknown"),
    name: raw.name || raw.full_name || "Analyst",
    email: raw.email || "",
    role: raw.role || "analyst",
    initials,
    avatarColor: raw.avatarColor || raw.avatar_color || "#2E7D52",
    isEmailVerified: Boolean(raw.isEmailVerified ?? raw.is_email_verified),
    twoFactorEnabled: Boolean(raw.twoFactorEnabled ?? raw.two_factor_enabled),
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
  };
}

export const authService = {
  /**
   * Submit credentials. Distinguishes between:
   * - fully authenticated
   * - 2FA required
   * - email verification required
   * - failure
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const mode = apiConfig.getMode();

    if (mode === "backend") {
      try {
        const res = await apiClient.post<any>("/api/auth/login", {
          email,
          password,
        });

        if (res.status === "two_factor_required") {
          return {
            status: "requires_2fa",
            message: res.message || "Verification code required.",
            twoFactorRequired: true,
            challenge_id: res.challenge_id,
            tempSessionId: res.challenge_id ? String(res.challenge_id) : undefined,
            user: res.user ? normalizeUser(res.user) : undefined,
          };
        }

        if (res.status === "authenticated" && res.user) {
          return {
            status: "authenticated",
            message: "Authentication successful.",
            user: normalizeUser(res.user),
          };
        }

        return {
          status: "authenticated",
          message: res.message || "Authentication successful.",
          user: res.user ? normalizeUser(res.user) : undefined,
        };
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 403 && (err.code === "EMAIL_VERIFICATION_REQUIRED" || err.message?.includes("Verify your email"))) {
          return {
            status: "requires_email_verification",
            message: "Email verification is required before signing in.",
            emailVerificationRequired: true,
          };
        }
        throw new Error(err?.message || "Invalid credentials. Please verify your email and password.");
      }
    }

    // Mock Mode
    await delay(600);
    const account = MOCK_ACCOUNTS.find(
      (a) =>
        a.email.toLowerCase() === email.toLowerCase() &&
        (a.password === password || password === "demo123" || password === "demo")
    );

    if (!account) {
      throw new Error("Invalid email or password. Please verify your credentials.");
    }

    if (!account.user.isEmailVerified) {
      return {
        status: "requires_email_verification",
        message: "Email verification is required before signing in.",
        emailVerificationRequired: true,
      };
    }

    if (account.user.twoFactorEnabled) {
      return {
        status: "requires_2fa",
        message: "Two-factor verification code required.",
        twoFactorRequired: true,
        user: account.user,
        tempSessionId: "999",
      };
    }

    return {
      status: "authenticated",
      message: "Authentication successful.",
      user: account.user,
    };
  },

  /**
   * Complete 2FA verification.
   */
  async verify2FA(
    code: string,
    email?: string,
    challengeId?: number
  ): Promise<TwoFactorVerifyResponse> {
    const mode = apiConfig.getMode();

    if (mode === "backend") {
      try {
        const res = await apiClient.post<any>("/api/auth/2fa/verify", {
          code: code.trim(),
          challenge_id: challengeId,
        });
        return {
          success: true,
          message: res.message || "Two-factor verification confirmed.",
          user: res.user ? normalizeUser(res.user) : undefined,
        };
      } catch (err: any) {
        throw new Error(err?.message || "Verification failed. Code may be invalid or expired.");
      }
    }

    // Mock Mode: Accept test codes or universal bypass
    await delay(500);
    const account = MOCK_ACCOUNTS.find((a) =>
      email ? a.email.toLowerCase() === email.toLowerCase() : true
    );

    const isValid =
      code === "000000" ||
      code === "246810" ||
      code === "135790" ||
      (code.length === 6 && /^\d+$/.test(code));

    if (!isValid) {
      throw new Error("Invalid or expired 6-digit verification code.");
    }

    return {
      success: true,
      message: "Two-factor verification confirmed.",
      user: account ? account.user : MOCK_ACCOUNTS[0].user,
    };
  },

  /**
   * Resend 2FA verification code.
   */
  async resend2FA(challengeId?: number, email?: string): Promise<{ success: boolean; message: string }> {
    const mode = apiConfig.getMode();
    if (mode === "backend") {
      try {
        const res = await apiClient.post<any>("/api/auth/2fa/resend", {
          challenge_id: challengeId,
          email,
        });
        return {
          success: true,
          message: res.message || "A new verification code has been dispatched.",
        };
      } catch (err: any) {
        throw new Error(err?.message || "Failed to resend code. Please try again later.");
      }
    }

    await delay(400);
    return {
      success: true,
      message: "A new verification code has been dispatched.",
    };
  },

  /**
   * Register a new analyst account.
   */
  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    const mode = apiConfig.getMode();
    if (mode === "backend") {
      try {
        const res = await apiClient.post<any>("/api/auth/register", {
          name: payload.name,
          full_name: payload.name,
          email: payload.email,
          password: payload.password,
          role: payload.role || "analyst",
        });
        return {
          success: true,
          message: res.message || "Registration successful. Please verify your email.",
          requiresEmailVerification: true,
          challenge_id: res.challenge_id,
        };
      } catch (err: any) {
        throw new Error(err?.message || "Registration failed. Email may already be registered.");
      }
    }

    await delay(700);
    return {
      success: true,
      message: "Registration successful. Please verify your email address to continue.",
      requiresEmailVerification: true,
    };
  },

  /**
   * Request password reset link.
   */
  async requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
    const mode = apiConfig.getMode();
    if (mode === "backend") {
      try {
        const res = await apiClient.post<any>("/api/auth/forgot-password", { email });
        return {
          success: true,
          message: res.message || "If an account exists, password reset instructions have been dispatched.",
          development_note: res.development_note,
        };
      } catch (err: any) {
        // Return generic success to prevent enumeration
        return {
          success: true,
          message: "If an account exists for this email, password reset instructions have been sent.",
        };
      }
    }

    await delay(500);
    return {
      success: true,
      message: "If an account exists for this email, password reset instructions have been sent.",
    };
  },

  /**
   * Reset password with reset token.
   */
  async resetPassword(payload: ResetPasswordPayload): Promise<ResetPasswordResponse> {
    const mode = apiConfig.getMode();
    if (mode === "backend") {
      try {
        const res = await apiClient.post<any>("/api/auth/reset-password", {
          token: payload.token,
          new_password: payload.newPassword,
          newPassword: payload.newPassword,
        });
        return {
          success: true,
          message: res.message || "Password updated successfully. You can now sign in.",
        };
      } catch (err: any) {
        throw new Error(err?.message || "Reset token is invalid or has expired.");
      }
    }

    await delay(600);
    if (!payload.token || payload.token === "invalid") {
      throw new Error("Password reset token is invalid or has expired.");
    }

    return {
      success: true,
      message: "Your password has been successfully reset. You may now sign in.",
    };
  },

  /**
   * Verify email address with verification token or OTP code.
   */
  async verifyEmail(tokenOrCode: string, challengeId?: number): Promise<VerifyEmailResponse> {
    const mode = apiConfig.getMode();
    if (mode === "backend") {
      try {
        const res = await apiClient.post<any>("/api/auth/verify-email", {
          token: tokenOrCode,
          code: tokenOrCode,
          challenge_id: challengeId,
        });
        return {
          success: true,
          message: res.message || "Email verified successfully.",
        };
      } catch (err: any) {
        throw new Error(err?.message || "Email verification token or code is invalid or expired.");
      }
    }

    await delay(400);
    return {
      success: true,
      message: "Email verified successfully.",
    };
  },

  /**
   * Terminate active session.
   */
  async logout(): Promise<void> {
    const mode = apiConfig.getMode();
    if (mode === "backend") {
      try {
        await apiClient.post("/api/auth/logout", {});
      } catch {
        // Ignore logout errors
      }
    }
  },

  /**
   * Fetch currently authenticated user from session cookie.
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    const mode = apiConfig.getMode();
    if (mode === "backend") {
      try {
        const res = await apiClient.get<any>("/api/auth/me");
        if (res && (res.user || res.id)) {
          return normalizeUser(res.user || res);
        }
        return null;
      } catch {
        return null;
      }
    }
    return null;
  },
};
