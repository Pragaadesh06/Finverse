import { Case, RiskLevel } from "../types";
import { apiConfig, request } from "./apiClient";
import { mockService } from "../mocks/mockService";

export const caseService = {
  async getCases(filter?: { status?: string; search?: string }): Promise<Case[]> {
    if (apiConfig.getMode() === "mock") {
      return mockService.getCases(filter);
    }
    const query = new URLSearchParams();
    if (filter?.status && filter.status !== "all") query.set("status", filter.status);
    if (filter?.search) query.set("search", filter.search);
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await request<any>(`/api/cases${qs}`);
    if (Array.isArray(res)) return res;
    return res.items || [];
  },

  async getCaseById(id: string): Promise<Case> {
    if (apiConfig.getMode() === "mock") {
      const c = mockService.getCaseById(id);
      if (!c) throw new Error(`Case ${id} not found`);
      return c;
    }
    return request<Case>(`/api/cases/${id}`);
  },

  async createCase(params: {
    title: string;
    case_type: Case["case_type"];
    severity: RiskLevel;
    related_accounts: string[];
    related_transactions: string[];
    summary: string;
    assigned_analyst?: string;
  }): Promise<Case> {
    if (apiConfig.getMode() === "mock") {
      return mockService.createCase(params);
    }
    return request<Case>("/api/cases", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  async updateCase(
    id: string,
    updates: Partial<Pick<Case, "status" | "assigned_analyst" | "severity">>
  ): Promise<Case> {
    if (apiConfig.getMode() === "mock") {
      return mockService.updateCase(id, updates);
    }
    return request<Case>(`/api/cases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async addNote(caseId: string, content: string, author?: string): Promise<Case> {
    if (apiConfig.getMode() === "mock") {
      return mockService.addCaseNote(caseId, content, author);
    }
    return request<Case>(`/api/cases/${caseId}/notes`, {
      method: "POST",
      body: JSON.stringify({ content, author }),
    });
  },
};
