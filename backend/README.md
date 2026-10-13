# Finverse — FastAPI Backend

Institutional Real-Time Fraud & AML Risk Orchestration Backend.

## Requirements
- Python 3.10+
- SQLite (default for development) or PostgreSQL

## Setup & Running

```bash
# 1. Install dependencies
python -m pip install -r requirements.txt

# 2. Run backend server with Uvicorn
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Running Tests

```bash
python -m pytest tests -v
```

## Environment Configuration

Configuration is loaded from `.env`:
- `DATABASE_URL`: `sqlite:///./finverse.db`
- `FRONTEND_ORIGINS`: `http://localhost:5173,http://127.0.0.1:5173`
- `SESSION_COOKIE_NAME`: `finverse_session`
- `EMAIL_MODE`: `console` (outputs OTP and password reset tokens to server console)
- `DEMO_AUTH_ENABLED`: `true`
