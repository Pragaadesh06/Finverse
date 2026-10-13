import { request } from "./apiClient";

export interface CounterfactualRule {
  code: string;
  label: string;
  description: string;
  contribution: number;
  severity: string;
  evidence?: string;
}

export interface SimulationParty {
  transaction_id?: string;
  amount: number;
  channel?: string;
  currency?: string;
  transaction: Record<string, any>;
  risk_score: number;
  risk_level: string;
  recommended_action: string;
  rules_triggered: CounterfactualRule[];
  ml_assessment: {
    model_version?: string;
    ml_score?: number;
    anomaly_flag?: boolean;
    feature_attributions?: Record<string, number>;
  };
}

export interface CounterfactualResponse {
  scenario_id: string;
  score_delta: number;
  baseline: SimulationParty;
  scenario: SimulationParty;
  delta: {
    score_change: number;
    score_delta: number;
    baseline_action: string;
    scenario_action: string;
    rules_eliminated: CounterfactualRule[];
    rules_introduced: CounterfactualRule[];
    rules_persisted: CounterfactualRule[];
    explanation: string;
  };
}

export interface CounterfactualRequest {
  baseline_id?: string;
  baseline_transaction_id?: string;
  modifications: Record<string, any>;
  rule_threshold_overrides?: Record<string, any>;
  custom_baseline?: Record<string, any>;
}

export const counterfactualService = {
  async runSimulation(payload: CounterfactualRequest): Promise<CounterfactualResponse> {
    return request<CounterfactualResponse>("/api/simulator/counterfactual", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
