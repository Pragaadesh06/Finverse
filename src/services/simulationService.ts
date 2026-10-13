import { apiConfig, request } from "./apiClient";
import { mockService } from "../mocks/mockService";

let isBackendSimulating = false;
const statusListeners = new Set<(running: boolean) => void>();

function notifyStatus(running: boolean) {
  isBackendSimulating = running;
  statusListeners.forEach((l) => l(running));
}

export const simulationService = {
  async startSimulation(): Promise<boolean> {
    if (apiConfig.getMode() === "mock") {
      return mockService.startSimulation();
    }
    const res = await request<{ status: string }>("/api/simulation/start", {
      method: "POST",
      body: JSON.stringify({ interval_seconds: 2 }),
    });
    const running = res.status === "started" || res.status === "running";
    notifyStatus(running);
    return running;
  },

  async stopSimulation(): Promise<boolean> {
    if (apiConfig.getMode() === "mock") {
      return mockService.stopSimulation();
    }
    const res = await request<{ status: string }>("/api/simulation/stop", { method: "POST" });
    const stopped = res.status === "stopped";
    notifyStatus(!stopped);
    return stopped;
  },

  isSimulating(): boolean {
    if (apiConfig.getMode() === "mock") {
      return mockService.isSimulationActive();
    }
    return isBackendSimulating;
  },

  onStatusChange(callback: (running: boolean) => void): () => void {
    if (apiConfig.getMode() === "mock") {
      return mockService.subscribeSimulationStatus(callback);
    }
    statusListeners.add(callback);
    callback(isBackendSimulating);
    return () => statusListeners.delete(callback);
  },
};
