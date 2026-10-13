export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RecommendedAction =
  | "allow"
  | "step_up_verification"
  | "manual_review"
  | "hold_for_review";

export type TransactionStatus =
  | "settled"
  | "flagged"
  | "held"
  | "under_investigation"
  | "blocked"
  | "cleared";

export type Transaction = {
  transaction_id: string;
  sender_account_id: string;
  receiver_account_id: string;
  sender_name?: string;
  receiver_name?: string;
  amount: number;
  currency: string;
  timestamp: string;
  risk_score: number | null;
  risk_level: RiskLevel | null;
  recommended_action: RecommendedAction | null;
  status: TransactionStatus | string;
  channel?: "WIRE" | "ACH" | "FASTER_PAYMENT" | "SWIFT" | "CARD" | "CRYPTO_GATEWAY";
  device_fingerprint?: string;
  ip_country?: string;
  location?: string;
  merchant_category?: string;
};

export type RiskFactor = {
  code: string;
  label: string;
  description: string;
  contribution: number | null; // e.g. +35 points
  evidence?: string;
  severity?: RiskLevel;
};

export type TimelineEvent = {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: "transaction" | "device_change" | "velocity_spike" | "rule_trigger" | "analyst_action";
};

export type RiskAssessment = {
  transaction_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  recommended_action: RecommendedAction;
  risk_factors: RiskFactor[];
  assessed_at: string;
  model_version?: string;
  confidence?: number;
  timeline?: TimelineEvent[];
};

export type NetworkNode = {
  id: string;
  label: string;
  account_holder: string;
  account_type: "Individual" | "Corporate" | "High-Risk Offshore" | "Crypto Exchange" | "MSB";
  risk_level: RiskLevel | null;
  transaction_count?: number;
  total_inflow?: number;
  total_outflow?: number;
  country?: string;
  is_flagged?: boolean;
};

export type NetworkEdge = {
  id: string;
  source: string;
  target: string;
  transaction_id: string;
  amount: number;
  currency: string;
  timestamp: string;
  risk_level?: RiskLevel;
  is_suspicious_path?: boolean;
};

export type NetworkGraphData = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  suspicious_cycle_ids?: string[];
  explanation?: string;
};

export type CaseType =
  | "aml_structuring"
  | "account_takeover"
  | "mule_account_ring"
  | "velocity_anomaly"
  | "sanctions_match";

export type CaseStatus = "open" | "in_review" | "escalated" | "resolved" | "closed";

export type CaseNote = {
  id: string;
  author: string;
  timestamp: string;
  content: string;
};

export type Case = {
  id: string;
  case_id: string;
  title: string;
  case_type: CaseType;
  severity: RiskLevel;
  status: CaseStatus;
  assigned_analyst: string;
  created_at: string;
  updated_at: string;
  related_accounts: string[];
  related_transactions: string[];
  notes: CaseNote[];
  summary: string;
  trigger_reason?: string;
};

export type Alert = {
  id: string;
  alert_type: string;
  transaction_id?: string;
  account_id?: string;
  risk_score: number;
  severity: RiskLevel;
  detected_at: string;
  explanation: string;
  status: "new" | "investigating" | "dismissed" | "resolved";
};

export type DashboardSummary = {
  total_transactions: number;
  high_risk_alerts: number;
  cases_under_investigation: number;
  avg_detection_latency_ms: number;
  trends: {
    total_transactions: string;
    high_risk_alerts: string;
    cases_under_investigation: string;
    avg_detection_latency_ms: string;
  };
  risk_distribution: {
    range: string;
    label: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  decisions_breakdown: {
    action: RecommendedAction;
    label: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  volume_over_time: {
    time: string;
    count: number;
    flagged_count: number;
    total_volume: number;
  }[];
};

export type ConfusionMatrix = {
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
};

export type ModelEvaluationMetrics = {
  dataset_id: string;
  dataset_name: string;
  sample_size: number;
  evaluation_period: string;
  is_synthetic: boolean;
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  avg_detection_latency_ms: number;
  confusion_matrix: ConfusionMatrix;
  engine_comparison: {
    metric: string;
    rules_only: number;
    combined_ai_engine: number;
    unit: string;
  }[];
  score_threshold_analysis: {
    threshold: number;
    precision: number;
    recall: number;
    fpr: number;
  }[];
};

export type AppDataSourceMode = "mock" | "backend";

export type ReportType = "client" | "transactions" | "fraud_alerts" | "cases" | "complete";

export interface ReportConfig {
  report_type: ReportType;
  start_date?: string;
  end_date?: string;
  risk_category?: string;
  status?: string;
  client_id?: string;
  min_amount?: number;
  max_amount?: number;
  format: "xlsx" | "csv";
}

export interface ReportPreviewKPIs {
  total_records: number;
  total_value_inr: number;
  alert_count: number;
  cases_open: number;
  cases_escalated: number;
  cases_total: number;
  risk_breakdown: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface ReportPreview {
  report_title: string;
  generated_at: string;
  report_type: ReportType;
  filters: Record<string, any>;
  summary: string;
  kpis: ReportPreviewKPIs;
  items: Transaction[];
  pagination: {
    page: number;
    page_size: number;
    total_pages: number;
    total_records: number;
  };
}

export interface ImportJobItem {
  import_id: string;
  filename: string;
  dataset_type: string;
  status: "previewed" | "processing" | "completed" | "failed";
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  imported_rows: number;
  skipped_rows: number;
  rejected_rows: number;
  held_rows: number;
  created_at: string;
  completed_at?: string;
  has_error_report: boolean;
}

export interface RowErrorItem {
  row_number: number;
  transaction_id: string;
  status: string;
  reason: string;
  errors?: { rule_id: string; field: string; message: string }[];
  data: Record<string, any>;
  risk_score: number;
  risk_level: string;
  recommended_action: string;
}

export interface ImportPreviewResponse {
  import_id: string;
  filename: string;
  dataset_type: string;
  status: string;
  expires_at: string;
  summary: {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    duplicate_rows: number;
    held_for_review_rows: number;
    risk_counts: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };
  headers: string[];
  column_mapping: Record<string, string>;
  sample_valid_rows: Record<string, any>[];
  row_errors: RowErrorItem[];
  duplicate_preview: RowErrorItem[];
}

export interface ImportConfirmResponse {
  import_id: string;
  filename: string;
  status: string;
  imported_rows: number;
  skipped_rows: number;
  rejected_rows: number;
  held_rows: number;
  completed_at?: string;
  message: string;
}

export interface TriggeredRule {
  rule_id: string;
  name: string;
  severity: RiskLevel;
  contribution: number;
  description: string;
  category: "integrity" | "behavioral" | "network" | "aml";
}

export interface ScreeningResult {
  is_valid: boolean;
  integrity_errors: { rule_id: string; field: string; message: string }[];
  data_quality_warnings: string[];
  risk_score: number;
  risk_level: RiskLevel;
  recommended_action: "allow" | "review" | "block" | "reject";
  rules_triggered: TriggeredRule[];
  features?: Record<string, any>;
  evaluated_at: string;
  engine_version: string;
}

export interface RiskMonitorStats {
  total_screened: number;
  accepted: number;
  held: number;
  blocked: number;
  critical_count: number;
  high_count: number;
  average_risk_score: number;
  engine_version: string;
  status: string;
}

export interface RiskFeedItem {
  transaction_id: string;
  timestamp: string;
  sender_account_id: string;
  receiver_account_id: string;
  sender_name?: string;
  receiver_name?: string;
  amount: number;
  currency: string;
  status: string;
  screening_status: string;
  risk_score: number;
  risk_level: RiskLevel;
  recommended_action: string;
  rules_triggered: TriggeredRule[];
  channel?: string;
  location?: string;
}
