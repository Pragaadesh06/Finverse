from pydantic import BaseModel, EmailStr, Field

class RegisterRequest(BaseModel):
    full_name: str | None = None
    name: str | None = None
    email: str
    password: str
    role: str = "analyst"

    def get_full_name(self) -> str:
        return (self.full_name or self.name or "").strip()

class LoginRequest(BaseModel):
    email: str
    password: str

class OTPVerifyRequest(BaseModel):
    code: str
    challenge_id: int | None = None

class ResendOTPRequest(BaseModel):
    challenge_id: int | None = None
    email: str | None = None

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str | None = None
    newPassword: str | None = None
    password: str | None = None

    def get_password(self) -> str:
        return self.new_password or self.newPassword or self.password or ""

class VerifyEmailRequest(BaseModel):
    code: str | None = None
    challenge_id: int | None = None
    token: str | None = None

class CaseCreate(BaseModel):
    title: str
    case_type: str
    severity: str = "medium"
    assigned_to: str | None = None
    assigned_analyst: str | None = None
    related_accounts: list[str] = Field(default_factory=list)
    related_transaction_ids: list[str] = Field(default_factory=list)
    related_transactions: list[str] = Field(default_factory=list)
    summary: str = ""

    def get_analyst(self) -> str:
        return self.assigned_to or self.assigned_analyst or "Sarah Chen (Lead AML)"

    def get_transaction_ids(self) -> list[str]:
        return self.related_transaction_ids or self.related_transactions or []

class CaseUpdate(BaseModel):
    title: str | None = None
    severity: str | None = None
    status: str | None = None
    assigned_to: str | None = None
    assigned_analyst: str | None = None
    summary: str | None = None

class NoteCreate(BaseModel):
    text: str | None = None
    content: str | None = None
    author: str | None = None

    def get_text(self) -> str:
        return (self.text or self.content or "").strip()

class DecisionRequest(BaseModel):
    action: str
    reason: str | None = None
    notes: str | None = None
    decision_type: str | None = None
    decisionType: str | None = None

    def get_reason(self) -> str:
        return self.reason or self.notes or self.decision_type or self.decisionType or ""

class SimulationRequest(BaseModel):
    interval_seconds: int | None = None

class ImportConfirmRequest(BaseModel):
    import_id: str
    policy: str = "partial" # "strict" | "partial"
    duplicate_policy: str = "skip" # "skip" | "reject"

class ScreenTransactionRequest(BaseModel):
    transaction_id: str | None = None
    sender_account_id: str
    receiver_account_id: str
    amount: float
    currency: str = "INR"
    sender_name: str | None = None
    receiver_name: str | None = None
    channel: str | None = "WIRE"
    location: str | None = "Mumbai, IN"
    device_id: str | None = None
    timestamp: str | None = None
    save_to_ledger: bool = False # If True, pre-ingestion gate commits to database

class OverrideDecisionRequest(BaseModel):
    final_action: str # "allowed" | "held" | "blocked" | "quarantined"
    decision_reason: str

class CustomerDisputeCreate(BaseModel):
    transaction_id: str
    reason: str
    description: str | None = None

class CustomerDisputeNote(BaseModel):
    message: str

class CounterfactualSimRequest(BaseModel):
    baseline_id: str | None = None
    baseline_transaction_id: str | None = None
    modifications: dict = Field(default_factory=dict)
    rule_threshold_overrides: dict = Field(default_factory=dict)
    custom_baseline: dict | None = None

    def get_baseline_id(self) -> str | None:
        return self.baseline_transaction_id or self.baseline_id


class UserRoleUpdateRequest(BaseModel):
    role: str
    customer_account_id: str | None = None

class CustomerProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    two_factor_enabled: bool | None = None
    current_password: str | None = None
    new_password: str | None = None


