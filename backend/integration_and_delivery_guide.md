# Finverse — Frontend & FastAPI Backend Integration and Delivery Guide

## Overview

This guide documents the contract reconciliation, authentication architecture, database schema, real-time WebSocket protocol, and end-to-end integration workflows between the **Finverse** React/TypeScript/Vite frontend and the FastAPI/SQLAlchemy backend.

---

## 1. System Architecture

```
┌──────────────────────────────────────────────┐
│       Finverse Frontend (Port 5173)          │
│   React 19 + TypeScript + Vite + Tailwind    │
│   Cytoscape.js Network Graph + Recharts      │
│   Old-Money Theme Engine (Light / Dark)      │
└──────────────────────┬───────────────────────┘
                       │
       HTTP Fetch with │ WebSocket
 credentials="include" │ Stream
                       ▼
┌──────────────────────────────────────────────┐
│        FastAPI Backend (Port 8000)           │
│   Uvicorn + Starlette + EventHub WebSocket   │
│   PBKDF2-HMAC-SHA256 Auth + Session Cookies  │
│   Algorithmic Risk Engine + Synthetic Sim    │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│     SQLite / PostgreSQL Database Layer       │
│   Users, AuthChallenges, PasswordResets,     │
│   Transactions (INR), Cases, AuditEvents     │
└──────────────────────────────────────────────┘
```

---

## 2. Reconciled API Contract Specification

All endpoints are mounted under `/api` (with auth routes supporting both `/api/auth/*` and `/auth/*` for seamless client compatibility).

### A. Authentication & Session Management

| Endpoint | Method | Request Payload | Response Body / Side-Effects |
|---|---|---|---|
| `/api/auth/register` | `POST` | `{"name": str, "email": str, "password": str, "role": str}` | `{"status": "verification_required", "challenge_id": int, "requiresEmailVerification": true}` |
| `/api/auth/verify-email` | `POST` | `{"code": str, "challenge_id": int, "token": str}` | `{"status": "verified", "success": true}` |
| `/api/auth/login` | `POST` | `{"email": str, "password": str}` | If 2FA enabled: `{"status": "two_factor_required", "challenge_id": int}`<br>If authenticated: `{"status": "authenticated", "user": UserProfile}` + sets `finverse_session` cookie |
| `/api/auth/2fa/verify` | `POST` | `{"code": str, "challenge_id": int}` | `{"status": "authenticated", "user": UserProfile}` + sets `finverse_session` cookie |
| `/api/auth/2fa/resend` | `POST` | `{"challenge_id": int, "email": str}` | `{"status": "sent", "challenge_id": int}` |
| `/api/auth/forgot-password`| `POST` | `{"email": str}` | `{"status": "accepted", "message": "..."}` |
| `/api/auth/reset-password` | `POST` | `{"token": str, "new_password": str}` | `{"status": "reset", "message": "..."}` |
| `/api/auth/logout` | `POST` | `{}` | `{"status": "logged_out"}` + clears cookie |
| `/api/auth/me` | `GET` | *(Cookie session)* | `{"id", "name", "email", "role", "initials", "avatarColor", "isEmailVerified", "twoFactorEnabled"}` |

### B. Core Intelligence Endpoints

| Endpoint | Method | Query / Body | Response Shape |
|---|---|---|---|
| `/api/dashboard/summary` | `GET` | None | `{ "total_transactions": int, "high_risk_alerts": int, "cases_under_investigation": int, "avg_detection_latency_ms": null, "currency": "INR", "decision_breakdown": dict, "decisions_breakdown": list, "risk_distribution": list, "volume_over_time": list, "recent_transactions": list }` |
| `/api/alerts` | `GET` | None | Array of `{ id, alert_type, transaction_id, account_id, risk_score, severity, detected_at, explanation, status }` |
| `/api/transactions` | `GET` | `search`, `risk_level`, `recommended_action`, `status`, `limit`, `offset` | `{ "items": Transaction[], "total": int, "page": int, "page_size": int, "pages": int }` |
| `/api/transactions/{id}` | `GET` | None | Transaction object + `{ "explanation": { "summary", "factors" }, "timeline": [...] }` |
| `/api/transactions/{id}/assessment` | `GET` | None | Risk assessment object with factors and timeline |
| `/api/transactions/{id}/decision` | `POST` | `{"action": str, "reason": str}` | Updated Transaction object + broadcasts `transaction.updated` event |
| `/api/network` | `GET` | None | Overview graph: `{ "nodes": Node[], "edges": Edge[], "suspicious_cycle_ids": str[], "explanation": str }` |
| `/api/network/{account_id}` | `GET` | `limit` (int) | Subgraph centered on `account_id` |
| `/api/cases` | `GET` | `status`, `search`, `page`, `page_size` | `{ "items": Case[], "total": int, "page": int, "page_size": int }` |
| `/api/cases` | `POST` | CaseCreate payload | Created Case object |
| `/api/cases/{case_id}` | `GET` | None | Case dossier payload |
| `/api/cases/{case_id}` | `PATCH` | `{"status": str, "severity": str, "assigned_to": str}` | Updated Case dossier |
| `/api/cases/{case_id}/notes`| `POST` | `{"text": str, "author": str}` | Case dossier with updated notes array |
| `/api/analytics/metrics` | `GET` | None | Benchmark evaluation metrics (confusion matrix, precision, recall, F1, score threshold sensitivity) |
| `/api/simulation/start` | `POST` | `{"interval_seconds": int}` | `{"status": "started", "interval_seconds": int, "mode": "synthetic"}` |
| `/api/simulation/stop` | `POST` | None | `{"status": "stopped"}` |

### C. Real-Time WebSocket Protocol

- **Connection URL**: `ws://localhost:8000/ws/transactions` (or `wss://` in production)
- **Handshake Authentication**: Handled via browser HttpOnly cookie `finverse_session` or query param `?token=...`.
- **Server Events**:
  - `connection.ready`: `{"type": "connection.ready", "data": {"service": "finverse-api"}}`
  - `transaction.created`: `{"type": "transaction.created", "data": Transaction}`
  - `transaction.updated`: `{"type": "transaction.updated", "data": Transaction}`
  - `alert.created`: `{"type": "alert.created", "data": Alert}`

---

## 3. Database Schema & Persistence

The application database is SQLite by default (`finverse.db`) and supports PostgreSQL with zero schema changes.

### Stored Tables
1. **`users`**: User identities, roles (`analyst`, `senior_analyst`, `admin`), password hashes (PBKDF2), 2FA state, email verification flags.
2. **`auth_challenges`**: Verification challenges for 2FA and email verification, hashed codes, attempts counter, expiration timestamps.
3. **`password_resets`**: Secure 30-minute password reset tokens with SHA-256 hashes and single-use consumption tracking.
4. **`transactions`**: High-volume financial transaction ledger with Indian Rupee (`INR`) values, risk scores, rule attribution factors, and settlement status.
5. **`cases`**: Investigation case dossiers, linked account entities, linked transaction IDs, and chronologically appended investigation notes.
6. **`audit_events`**: Cryptographically verifiable audit trail recording all login, decision, and case mutation events.

---

## 4. Default Seed Credentials

Seed data is initialized automatically on first startup:

| Role | Email | Password | 2FA Status |
|---|---|---|---|
| **Lead AML Analyst** | `analyst@finverse.io` | `Finverse@2025` | Enabled (`246810` or console OTP) |
| **System Administrator** | `admin@finverse.io` | `Admin@2025` | Enabled (`135790` or console OTP) |
| **Demo Analyst** | `demo@finverse.io` | `demo` | Disabled (Instant login) |

---

## 5. How to Run Applications

### Terminal 1: Backend Server
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2: Frontend Dev Server
```bash
npm run dev
```

The frontend will run on `http://localhost:5173` and communicate with `http://127.0.0.1:8000`.

---

## 6. Test & Build Commands

- **Backend Tests**: `cd backend && python -m pytest tests -v` (9 passed)
- **Backend Compilation**: `cd backend && python -m compileall app` (0 errors)
- **Frontend Typecheck & Build**: `npm run build` (`tsc -b && vite build` -> Exit code 0)
