from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Finverse API"
    environment: str = "development"
    database_url: str = "sqlite:///./finverse.db"
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    session_secret: str = "development-only-change-this-secret-before-deployment"
    session_cookie_name: str = "finverse_session"
    session_cookie_secure: bool = False
    session_cookie_samesite: str = "lax"
    session_ttl_minutes: int = 720
    otp_ttl_minutes: int = 10
    otp_max_attempts: int = 5
    demo_auth_enabled: bool = True
    email_mode: str = "console"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = "security@finverse.local"
    simulation_interval_seconds: int = 2
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
