from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, DateTime, Boolean, ForeignKey, Text, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    role: Mapped[str] = mapped_column(String(30), default="customer") # customer, analyst, senior_analyst, compliance_officer, admin
    customer_account_id: Mapped[str | None] = mapped_column(String(40), nullable=True, default=None)
    organization_id: Mapped[str | None] = mapped_column(String(40), nullable=True, default="FINVERSE-CORP")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuthChallenge(Base):
    __tablename__ = "auth_challenges"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    purpose: Mapped[str] = mapped_column(String(30), index=True)
    code_hash: Mapped[str] = mapped_column(String(255))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class PasswordReset(Base):
    __tablename__ = "password_resets"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(255))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)

class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (Index("ix_transactions_timestamp", "timestamp"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    transaction_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    sender_account_id: Mapped[str] = mapped_column(String(40), index=True)
    receiver_account_id: Mapped[str] = mapped_column(String(40), index=True)
    sender_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    receiver_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    device_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="processed")
    screening_status: Mapped[str] = mapped_column(String(30), default="accepted") # accepted, pending_review, quarantined, rejected
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    risk_level: Mapped[str] = mapped_column(String(20), default="low")
    recommended_action: Mapped[str] = mapped_column(String(40), default="allow")
    risk_factors: Mapped[list] = mapped_column(JSON, default=list)
    is_suspicious_label: Mapped[bool] = mapped_column(Boolean, default=False)
    channel: Mapped[str | None] = mapped_column(String(40), nullable=True, default="WIRE")
    ip_country: Mapped[str | None] = mapped_column(String(10), nullable=True, default="IN")
    merchant_category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    import_id: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict)

class Case(Base):
    __tablename__ = "cases"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    case_type: Mapped[str] = mapped_column(String(80))
    severity: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(30), default="open")
    assigned_to: Mapped[str | None] = mapped_column(String(120), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    trigger_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    related_accounts: Mapped[list] = mapped_column(JSON, default=list)
    related_transaction_ids: Mapped[list] = mapped_column(JSON, default=list)
    notes: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    action: Mapped[str] = mapped_column(String(100))
    entity_type: Mapped[str] = mapped_column(String(60))
    entity_id: Mapped[str] = mapped_column(String(80))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class ImportJob(Base):
    __tablename__ = "import_jobs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    import_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    dataset_type: Mapped[str] = mapped_column(String(50), default="transactions")
    status: Mapped[str] = mapped_column(String(30), default="previewed") # previewed, processing, completed, failed
    total_rows: Mapped[int] = mapped_column(Integer, default=0)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0)
    invalid_rows: Mapped[int] = mapped_column(Integer, default=0)
    duplicate_rows: Mapped[int] = mapped_column(Integer, default=0)
    imported_rows: Mapped[int] = mapped_column(Integer, default=0)
    skipped_rows: Mapped[int] = mapped_column(Integer, default=0)
    rejected_rows: Mapped[int] = mapped_column(Integer, default=0)
    held_rows: Mapped[int] = mapped_column(Integer, default=0)
    error_report: Mapped[list] = mapped_column(JSON, default=list)
    preview_data: Mapped[dict] = mapped_column(JSON, default=dict)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

class ScreeningAssessment(Base):
    __tablename__ = "screening_assessments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assessment_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    transaction_id: Mapped[str] = mapped_column(String(40), index=True)
    source: Mapped[str] = mapped_column(String(40), default="manual_entry") # manual_entry, excel_import, api_ingestion, simulation, re_screening
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    risk_level: Mapped[str] = mapped_column(String(20), default="low") # low, medium, high, critical
    recommended_action: Mapped[str] = mapped_column(String(40), default="allow") # allow, review, block
    final_action: Mapped[str] = mapped_column(String(40), default="allowed") # allowed, held, blocked, quarantined, overridden
    rules_triggered: Mapped[list] = mapped_column(JSON, default=list)
    data_quality_warnings: Mapped[list] = mapped_column(JSON, default=list)
    engine_version: Mapped[str] = mapped_column(String(40), default="Finverse-RiskGate-v2.1")
    actor_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    decision_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_latest: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class CustomerDispute(Base):
    __tablename__ = "customer_disputes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reference_no: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    transaction_id: Mapped[str] = mapped_column(String(40), index=True)
    reason: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="submitted") # submitted, under_review, investigating, resolved, rejected
    analyst_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    customer_updates: Mapped[list] = mapped_column(JSON, default=list)
    case_id: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class SimulationScenario(Base):
    __tablename__ = "simulation_scenarios"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scenario_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    baseline_transaction_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    modifications: Mapped[dict] = mapped_column(JSON, default=dict)
    rule_threshold_overrides: Mapped[dict] = mapped_column(JSON, default=dict)
    baseline_score: Mapped[int] = mapped_column(Integer, default=0)
    scenario_score: Mapped[int] = mapped_column(Integer, default=0)
    baseline_action: Mapped[str] = mapped_column(String(40), default="allow")
    scenario_action: Mapped[str] = mapped_column(String(40), default="allow")
    delta_summary: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

