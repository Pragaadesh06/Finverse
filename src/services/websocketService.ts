import { Transaction, Alert } from "../types";
import { apiConfig, API_BASE_URL } from "./apiClient";
import { mockService } from "../mocks/mockService";

export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error";

type TransactionListener = (tx: Transaction) => void;
type AlertListener = (alert: Alert) => void;
type StatusListener = (status: ConnectionStatus) => void;

class RealtimeStreamManager {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = "disconnected";
  private txListeners: Set<TransactionListener> = new Set();
  private alertListeners: Set<AlertListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectTimeout: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 6;
  private mockTxUnsub: (() => void) | null = null;
  private mockAlertUnsub: (() => void) | null = null;

  constructor() {
    apiConfig.onModeChange(() => {
      this.disconnect();
      this.connect();
    });
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(newStatus: ConnectionStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((l) => l(newStatus));
  }

  public connect() {
    if (this.status === "connected" || this.status === "connecting") return;

    if (apiConfig.getMode() === "mock") {
      this.setStatus("connecting");
      setTimeout(() => {
        this.mockTxUnsub = mockService.subscribeTransactions((tx) => {
          this.txListeners.forEach((l) => l(tx));
        });
        this.mockAlertUnsub = mockService.subscribeAlerts((alert) => {
          this.alertListeners.forEach((l) => l(alert));
        });
        this.setStatus("connected");
      }, 300);
      return;
    }

    // Backend WebSocket Mode
    this.setStatus("connecting");
    const wsUrl = API_BASE_URL.replace(/^http/, "ws") + "/ws/transactions";

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus("connected");
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const isTxEvent =
            payload.type === "transaction" ||
            payload.type === "transaction.created" ||
            payload.type === "transaction.updated" ||
            Boolean(payload.transaction_id) ||
            Boolean(payload.data?.transaction_id);

          const isAlertEvent =
            payload.type === "alert" ||
            payload.type === "alert.created" ||
            Boolean(payload.data?.alert_type);

          if (isTxEvent) {
            const tx: Transaction = payload.data || payload;
            this.txListeners.forEach((l) => l(tx));
          } else if (isAlertEvent) {
            const alert: Alert = payload.data || payload;
            this.alertListeners.forEach((l) => l(alert));
          }
        } catch {
          // ignore non-json
        }
      };

      this.ws.onerror = () => {
        this.setStatus("error");
      };

      this.ws.onclose = () => {
        this.setStatus("disconnected");
        this.ws = null;
        this.scheduleReconnect();
      };
    } catch {
      this.setStatus("error");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (apiConfig.getMode() === "mock") return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(1000 * Math.pow(1.8, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public disconnect() {
    if (this.mockTxUnsub) {
      this.mockTxUnsub();
      this.mockTxUnsub = null;
    }
    if (this.mockAlertUnsub) {
      this.mockAlertUnsub();
      this.mockAlertUnsub = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("disconnected");
  }

  public onTransaction(listener: TransactionListener): () => void {
    this.txListeners.add(listener);
    return () => this.txListeners.delete(listener);
  }

  public onAlert(listener: AlertListener): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  public onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }
}

export const realtimeStream = new RealtimeStreamManager();
