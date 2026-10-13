import hashlib
import hmac
import secrets
import smtplib
import time
from email.mime.text import MIMEText
from app.config import settings

def hash_value(val: str) -> str:
    return hashlib.sha256(val.encode("utf-8")).hexdigest()

def hash_password(password: str) -> str:
    # Use PBKDF2-HMAC-SHA256 with salt
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    try:
        if "$" not in hashed:
            return False
        salt, key_hex = hashed.split("$", 1)
        expected = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return secrets.compare_digest(expected.hex(), key_hex)
    except Exception:
        return False

def create_session_token(user_id: int) -> str:
    timestamp = int(time.time())
    payload = f"{user_id}:{timestamp}"
    sig = hmac.new(settings.session_secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"

def decode_session_token(token: str | None) -> int | None:
    if not token or ":" not in token:
        return None
    try:
        parts = token.split(":")
        if len(parts) != 3:
            return None
        user_id_str, ts_str, sig = parts
        payload = f"{user_id_str}:{ts_str}"
        expected = hmac.new(settings.session_secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not secrets.compare_digest(expected, sig):
            return None
        ts = int(ts_str)
        now = int(time.time())
        if now - ts > settings.session_ttl_minutes * 60:
            return None
        return int(user_id_str)
    except Exception:
        return None

def new_otp() -> str:
    return f"{secrets.randbelow(1000000):06d}"

def new_reset_token() -> str:
    return secrets.token_urlsafe(32)

def send_email(to_email: str, subject: str, body: str) -> None:
    if settings.email_mode == "console" or not settings.smtp_host:
        print("\n" + "="*60)
        print(f"[DEVELOPMENT EMAIL CONSOLE ADAPTER]")
        print(f"TO:      {to_email}")
        print(f"SUBJECT: {subject}")
        print(f"BODY:\n{body}")
        print("="*60 + "\n", flush=True)
        return

    # Real SMTP delivery if configured
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from
        msg["To"] = to_email

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)
    except Exception as e:
        print(f"[EMAIL DELIVERY ERROR] Failed to send email to {to_email}: {e}", flush=True)
