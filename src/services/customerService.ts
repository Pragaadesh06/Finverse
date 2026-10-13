import { request, API_BASE_URL } from "./apiClient";

export interface CustomerSummary {
  total_outflow_inr: number;
  total_inflow_inr: number;
  total_transactions: number;
  active_disputes: number;
}

export interface StatusGuideItem {
  status: string;
  explanation: string;
}

export interface CustomerTransactionItem {
  account_id: string;
  transaction_id: string;
  timestamp: string | null;
  counterparty: string;
  counterparty_account: string;
  direction: "outflow" | "inflow";
  amount: number;
  currency: string;
  status: string;
  channel: string;
  reference: string;
}

export interface CustomerOverviewResponse {
  customer_name: string;
  email: string;
  account_id: string;
  summary: CustomerSummary;
  activity_summary: CustomerSummary;
  recent_transactions: CustomerTransactionItem[];
  status_guide: StatusGuideItem[];
}

export interface CustomerTransactionsResponse {
  items: CustomerTransactionItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface CustomerDisputeUpdate {
  timestamp: string;
  status: string;
  message: string;
}

export interface CustomerDisputeItem {
  reference_no: string;
  transaction_id: string;
  case_id?: string;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
  updates: CustomerDisputeUpdate[];
}

export interface CustomerDisputesResponse {
  disputes: CustomerDisputeItem[];
  count: number;
}

export interface SubmitDisputePayload {
  transaction_id: string;
  reason: string;
  description?: string;
}

export const customerService = {
  async getOverview(): Promise<CustomerOverviewResponse> {
    return request<CustomerOverviewResponse>("/api/customer/overview");
  },

  async getTransactions(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
  }): Promise<CustomerTransactionsResponse> {
    return request<CustomerTransactionsResponse>("/api/customer/transactions", {
      params,
    });
  },

  async submitDispute(payload: SubmitDisputePayload): Promise<{
    dispute_id: string;
    reference_no: string;
    case_id: string;
    transaction_id: string;
    status: string;
    reason: string;
    message: string;
  }> {
    return request("/api/customer/disputes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getDisputes(): Promise<CustomerDisputesResponse> {
    return request<CustomerDisputesResponse>("/api/customer/disputes");
  },

  getExportDownloadUrl(): string {
    return `${API_BASE_URL}/api/customer/export`;
  },

  async updateProfile(payload: {
    full_name?: string;
    phone?: string;
    two_factor_enabled?: boolean;
  }): Promise<any> {
    return request("/api/customer/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
