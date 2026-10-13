import { NetworkGraphData } from "../types";
import { apiConfig, request } from "./apiClient";
import { mockService } from "../mocks/mockService";

export const networkService = {
  async getNetworkGraph(accountId?: string): Promise<NetworkGraphData> {
    if (apiConfig.getMode() === "mock") {
      return mockService.getNetworkGraph(accountId);
    }
    const endpoint = accountId ? `/api/network/${accountId}` : "/api/network";
    const res = await request<NetworkGraphData>(endpoint);
    return {
      nodes: res.nodes || [],
      edges: res.edges || [],
      suspicious_cycle_ids: res.suspicious_cycle_ids || [],
      explanation: res.explanation || "",
    };
  },
};
