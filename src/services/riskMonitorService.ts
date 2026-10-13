import { request } from "./apiClient";
import {
  RiskMonitorStats,
  RiskFeedItem,
  ScreeningResult,
  Transaction,
} from "../types";

export const riskMonitorService = {
  async getRiskStats(): Promise<RiskMonitorStats> {
    return request<RiskMonitorStats>("/api/risk-monitor/stats");
  },

  async getRiskFeed(
    riskLevel?: string,
    action?: string,
    limit: number = 50
  ): Promise<RiskFeedItem[]> {
    const params: Record<string, any> = { limit };
    if (riskLevel && riskLevel !== "all") params.risk_level = riskLevel;
    if (action && action !== "all") params.action = action;
    const res = await request<{ feed: RiskFeedItem[]; count: number }>(
      "/api/risk-monitor/feed",
      { params }
    );
    return res.feed || [];
  },

  async screenTransaction(
    data: {
      transaction_id?: string;
      sender_account_id: string;
      receiver_account_id: string;
      amount: number;
      currency?: string;
      sender_name?: string;
      receiver_name?: string;
      channel?: string;
      location?: string;
      device_id?: string;
      save_to_ledger?: boolean;
    }
  ): Promise<{
    screening_result: ScreeningResult;
    transaction?: Transaction;
    committed: boolean;
    rejection_reason?: string;
  }> {
    return request<{
      screening_result: ScreeningResult;
      transaction?: Transaction;
      committed: boolean;
      rejection_reason?: string;
    }>("/api/transactions/screen", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async rescreenTransaction(transactionId: string): Promise<{
    assessment: any;
    transaction: Transaction;
  }> {
    return request<{ assessment: any; transaction: Transaction }>(
      `/api/transactions/${transactionId}/rescreen`,
      { method: "POST" }
    );
  },

  async overrideDecision(
    assessmentId: string,
    finalAction: "allowed" | "held" | "blocked" | "quarantined",
    reason: string
  ): Promise<any> {
    return request(`/api/screenings/${assessmentId}/override`, {
      method: "POST",
      body: JSON.stringify({
        final_action: finalAction,
        decision_reason: reason,
      }),
    });
  },
};
