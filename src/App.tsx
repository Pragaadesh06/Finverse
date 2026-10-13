import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PublicOnlyRoute } from "./components/auth/PublicOnlyRoute";
import { RoleProtectedRoute } from "./components/auth/RoleProtectedRoute";
import { useAuth } from "./contexts/AuthContext";
import { Shell } from "./components/layout/Shell";

// Auth Pages
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";
import { TwoFactorPage } from "./pages/auth/TwoFactorPage";

// Main Institutional Application Pages
import { DashboardPage } from "./pages/DashboardPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { TransactionDetailsPage } from "./pages/TransactionDetailsPage";
import { NetworkPage } from "./pages/NetworkPage";
import { CasesPage } from "./pages/CasesPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ExportCenterPage } from "./pages/ExportCenterPage";
import { ImportDataPage } from "./pages/ImportDataPage";
import { RiskMonitorPage } from "./pages/RiskMonitorPage";
import { CounterfactualSimulatorPage } from "./pages/CounterfactualSimulatorPage";

// Customer Portal Pages
import { CustomerDashboardPage } from "./pages/customer/CustomerDashboardPage";
import { CustomerTransactionsPage } from "./pages/customer/CustomerTransactionsPage";
import { CustomerDisputesPage } from "./pages/customer/CustomerDisputesPage";
import { CustomerExportPage } from "./pages/customer/CustomerExportPage";
import { CustomerProfilePage } from "./pages/customer/CustomerProfilePage";
import { CustomerSupportPage } from "./pages/customer/CustomerSupportPage";
import { AccessDeniedPage } from "./pages/AccessDeniedPage";

const INSTITUTIONAL_ROLES = ["analyst", "senior_analyst", "compliance_officer", "admin"] as const;
const CUSTOMER_ROLES = ["customer", "admin"] as const;

function IndexRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "customer") return <Navigate to="/customer/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

function FallbackRedirect() {
  const { user } = useAuth();
  if (user?.role === "customer") return <Navigate to="/customer/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

function AppRoutes() {
  return (
    <Routes>
      {/* ── Public Auth Routes ── */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPasswordPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicOnlyRoute>
            <ResetPasswordPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/verify-email"
        element={<VerifyEmailPage />}
      />
      <Route
        path="/verify-2fa"
        element={<TwoFactorPage />}
      />
      {/* Compatibility alias for /verify */}
      <Route
        path="/verify"
        element={<Navigate to="/verify-2fa" replace />}
      />

      {/* ── Protected Application Shell Routes ── */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell />
          </ProtectedRoute>
        }
      >
        <Route index element={<IndexRedirect />} />
        <Route path="access-denied" element={<AccessDeniedPage />} />

        {/* ── Institutional Workspace (Analysts, Senior Analysts, Compliance, Admins) ── */}
        <Route
          path="dashboard"
          element={
            <RoleProtectedRoute allowedRoles={INSTITUTIONAL_ROLES}>
              <DashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="risk-monitor"
          element={
            <RoleProtectedRoute allowedRoles={INSTITUTIONAL_ROLES}>
              <RiskMonitorPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="transactions"
          element={
            <RoleProtectedRoute allowedRoles={INSTITUTIONAL_ROLES}>
              <TransactionsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="transactions/:id"
          element={
            <RoleProtectedRoute allowedRoles={INSTITUTIONAL_ROLES}>
              <TransactionDetailsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="simulator"
          element={
            <RoleProtectedRoute allowedRoles={INSTITUTIONAL_ROLES}>
              <CounterfactualSimulatorPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="network"
          element={
            <RoleProtectedRoute allowedRoles={INSTITUTIONAL_ROLES}>
              <NetworkPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="cases"
          element={
            <RoleProtectedRoute allowedRoles={INSTITUTIONAL_ROLES}>
              <CasesPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="analytics"
          element={
            <RoleProtectedRoute allowedRoles={INSTITUTIONAL_ROLES}>
              <AnalyticsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="export"
          element={
            <RoleProtectedRoute allowedRoles={INSTITUTIONAL_ROLES}>
              <ExportCenterPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="import"
          element={
            <RoleProtectedRoute allowedRoles={INSTITUTIONAL_ROLES}>
              <ImportDataPage />
            </RoleProtectedRoute>
          }
        />

        {/* ── Customer Portal Routes (Customer & Admin) ── */}
        <Route
          path="customer/dashboard"
          element={
            <RoleProtectedRoute allowedRoles={CUSTOMER_ROLES}>
              <CustomerDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="customer/transactions"
          element={
            <RoleProtectedRoute allowedRoles={CUSTOMER_ROLES}>
              <CustomerTransactionsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="customer/disputes"
          element={
            <RoleProtectedRoute allowedRoles={CUSTOMER_ROLES}>
              <CustomerDisputesPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="customer/export"
          element={
            <RoleProtectedRoute allowedRoles={CUSTOMER_ROLES}>
              <CustomerExportPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="customer/profile"
          element={
            <RoleProtectedRoute allowedRoles={CUSTOMER_ROLES}>
              <CustomerProfilePage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="customer/support"
          element={
            <RoleProtectedRoute allowedRoles={CUSTOMER_ROLES}>
              <CustomerSupportPage />
            </RoleProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<FallbackRedirect />} />
    </Routes>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
