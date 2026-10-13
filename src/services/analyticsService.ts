import { ModelEvaluationMetrics } from "../types";
import { apiConfig, request } from "./apiClient";
import { mockService } from "../mocks/mockService";

export const analyticsService = {
  async getModelMetrics(datasetId?: string): Promise<ModelEvaluationMetrics> {
    if (apiConfig.getMode() === "mock") {
      return mockService.getAnalyticsMetrics();
    }
    const qs = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : "";
    return request<ModelEvaluationMetrics>(`/api/analytics/metrics${qs}`);
  },
};
