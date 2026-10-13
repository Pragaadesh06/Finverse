import { DashboardSummary, Alert } from "../types";
import { apiConfig, request } from "./apiClient";
import { mockService } from "../mocks/mockService";

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    if (apiConfig.getMode() === "mock") {
      return mockService.getDashboardSummary();
    }
    return request<DashboardSummary>("/api/dashboard/summary");
  },

  async getRecentAlerts(): Promise<Alert[]> {
    if (apiConfig.getMode() === "mock") {
      return mockService.getAlerts();
    }
    return request<Alert[]>("/api/alerts");
  },
};
