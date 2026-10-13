import { Transaction, RiskAssessment, RecommendedAction } from "../types";
import { apiConfig, request } from "./apiClient";
import { mockService } from "../mocks/mockService";

export interface TransactionQueryParams {
  search?: string;
  risk_level?: string;
  recommended_action?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export const transactionService = {
  async getTransactions(
    params?: TransactionQueryParams
  ): Promise<{ items: Transaction[]; total: number }> {
    if (apiConfig.getMode() === "mock") {
      return mockService.getTransactions(params);
    }

    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.risk_level && params.risk_level !== "all") query.set("risk_level", params.risk_level);
    if (params?.recommended_action && params.recommended_action !== "all") query.set("recommended_action", params.recommended_action);
    if (params?.status && params.status !== "all") query.set("status", params.status);
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.offset) query.set("offset", params.offset.toString());

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await request<any>(`/api/transactions${qs}`);
    if (Array.isArray(res)) {
      return { items: res, total: res.length };
    }
    return {
      items: res.items || [],
      total: res.total ?? (res.items ? res.items.length : 0),
    };
  },

  async getTransactionById(id: string): Promise<Transaction> {
    if (apiConfig.getMode() === "mock") {
      const tx = mockService.getTransactionById(id);
      if (!tx) throw new Error(`Transaction ${id} not found`);
      return tx;
    }
    return request<Transaction>(`/api/transactions/${id}`);
  },

  async getRiskAssessment(id: string): Promise<RiskAssessment> {
    if (apiConfig.getMode() === "mock") {
      return mockService.getRiskAssessment(id);
    }
    return request<RiskAssessment>(`/api/transactions/${id}/assessment`);
  },

  async recordDecision(params: {
    transactionId: string;
    action: RecommendedAction;
    decisionType: "approve" | "escalate" | "block";
    notes: string;
  }): Promise<Transaction> {
    if (apiConfig.getMode() === "mock") {
      return mockService.recordAnalystDecision(
        params.transactionId,
        params.action,
        params.decisionType,
        params.notes
      );
    }

    return request<Transaction>(`/api/transactions/${params.transactionId}/decision`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
};
