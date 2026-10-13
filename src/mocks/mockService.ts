import {
  Transaction,
  RiskAssessment,
  NetworkGraphData,
  Case,
  Alert,
  DashboardSummary,
  ModelEvaluationMetrics,
  RiskLevel,
  RecommendedAction,
} from "../types";
import {
  INITIAL_TRANSACTIONS,
  MOCK_RISK_ASSESSMENTS,
  MOCK_NETWORK_GRAPH,
  INITIAL_CASES,
  INITIAL_ALERTS,
  MOCK_MODEL_METRICS,
} from "./mockData";
import { getRiskLevelFromScore } from "../lib/utils";

type Listener<T> = (data: T) => void;

class MockDataService {
  private transactions: Transaction[] = [...INITIAL_TRANSACTIONS];
  private cases: Case[] = [...INITIAL_CASES];
  private alerts: Alert[] = [...INITIAL_ALERTS];
  private riskAssessments: Record<string, RiskAssessment> = { ...MOCK_RISK_ASSESSMENTS };
  private networkGraph: NetworkGraphData = { ...MOCK_NETWORK_GRAPH };

  private isSimulating: boolean = false;
  private simTimer: any = null;
  private txListeners: Set<Listener<Transaction>> = new Set();
  private alertListeners: Set<Listener<Alert>> = new Set();
  private statusListeners: Set<Listener<boolean>> = new Set();

  private txCounter: number = 98105;
  private alertCounter: number = 4402;
  private caseCounter: number = 82;

  constructor() {
    this.startSimulation(); // start by default in mock mode
  }

  // --- Real-time Subscription ---
  public subscribeTransactions(listener: Listener<Transaction>): () => void {
    this.txListeners.add(listener);
    return () => this.txListeners.delete(listener);
  }

  public subscribeAlerts(listener: Listener<Alert>): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  public subscribeSimulationStatus(listener: Listener<boolean>): () => void {
    this.statusListeners.add(listener);
    listener(this.isSimulating);
    return () => this.statusListeners.delete(listener);
  }

  // --- Simulation Control ---
  public startSimulation(): boolean {
    if (this.isSimulating) return true;
    this.isSimulating = true;
    this.statusListeners.forEach((l) => l(true));

    this.simTimer = setInterval(() => {
      this.generateSyntheticTransaction();
    }, 4500); // New event every 4.5 seconds

    return true;
  }

  public stopSimulation(): boolean {
    if (!this.isSimulating) return false;
    this.isSimulating = false;
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
    this.statusListeners.forEach((l) => l(false));
    return false;
  }

  public isSimulationActive(): boolean {
    return this.isSimulating;
  }

  public generateSyntheticTransaction(): Transaction {
    const txId = `TX-2026-${this.txCounter++}`;
    const entities = [
      { id: "ACC-8491", name: "Apex Global Trading Ltd", type: "Corporate" },
      { id: "ACC-3042", name: "Meridian Horizon LLC", type: "High-Risk Offshore" },
      { id: "ACC-6109", name: "Vanguard Asset Management", type: "Corporate" },
      { id: "ACC-1928", name: "Nova Retail Partners", type: "Corporate" },
      { id: "ACC-5120", name: "Kaelen Voss (Personal)", type: "Individual" },
      { id: "ACC-7721", name: "BitShield Escrow Desk", type: "Crypto Exchange" },
      { id: "ACC-9020", name: "Stripe Settlement Hub", type: "MSB" },
      { id: "ACC-4412", name: "BioHealth Diagnostics", type: "Corporate" },
      { id: "ACC-7182", name: "Atlas Cloud Infrastructure", type: "Corporate" },
      { id: "ACC-3190", name: "Lucia Fernandez", type: "Individual" },
    ];

    const sender = entities[Math.floor(Math.random() * entities.length)];
    let receiver = entities[Math.floor(Math.random() * entities.length)];
    while (receiver.id === sender.id) {
      receiver = entities[Math.floor(Math.random() * entities.length)];
    }

    // Determine synthetic risk profile
    const isAnomaly = Math.random() < 0.28; // ~28% suspicious rate in simulation
    let score: number;
    let amount: number;

    if (isAnomaly) {
      score = Math.floor(65 + Math.random() * 34); // 65 - 98
      amount = Math.random() < 0.5 ? 9800 + Math.floor(Math.random() * 150) : Math.floor(35000 + Math.random() * 180000);
    } else {
      score = Math.floor(4 + Math.random() * 32); // 4 - 36
      amount = Math.floor(50 + Math.random() * 8500);
    }

    const riskLevel: RiskLevel = getRiskLevelFromScore(score);
    let recommendedAction: RecommendedAction = "allow";
    let status = "settled";

    if (riskLevel === "critical") {
      recommendedAction = "hold_for_review";
      status = "held";
    } else if (riskLevel === "high") {
      recommendedAction = Math.random() > 0.5 ? "manual_review" : "step_up_verification";
      status = "flagged";
    } else if (riskLevel === "medium") {
      recommendedAction = "step_up_verification";
      status = "settled";
    }

    const channels: Transaction["channel"][] = ["SWIFT", "WIRE", "ACH", "FASTER_PAYMENT", "CRYPTO_GATEWAY", "CARD"];
    const channel = channels[Math.floor(Math.random() * channels.length)];

    const tx: Transaction = {
      transaction_id: txId,
      sender_account_id: sender.id,
      sender_name: sender.name,
      receiver_account_id: receiver.id,
      receiver_name: receiver.name,
      amount,
      currency: "USD",
      timestamp: new Date().toISOString(),
      risk_score: score,
      risk_level: riskLevel,
      recommended_action: recommendedAction,
      status,
      channel,
      device_fingerprint: `fp_${Math.random().toString(16).substring(2, 10)}`,
      ip_country: isAnomaly ? "CY" : "US",
    };

    // Prepend to transaction array
    this.transactions.unshift(tx);
    if (this.transactions.length > 250) {
      this.transactions.pop();
    }

    // Generate Risk Assessment if high or critical
    if (score >= 65) {
      this.riskAssessments[txId] = {
        transaction_id: txId,
        risk_score: score,
        risk_level: riskLevel,
        recommended_action: recommendedAction,
        assessed_at: tx.timestamp,
        model_version: "Finverse-XGBoost-GNN-v3.4.1",
        confidence: Number((0.89 + Math.random() * 0.09).toFixed(3)),
        risk_factors: [
          {
            code: "RAPID_ANOMALOUS_FLOW",
            label: "Anomalous Topology Velocity",
            description: `Fund transfer between ${sender.name} and ${receiver.name} exhibits sharp deviation from peer clusters.`,
            contribution: Math.floor(score * 0.45),
            severity: riskLevel,
            evidence: `Flow rate deviation: +${(score / 15).toFixed(1)}σ variance from expected graph baseline.`,
          },
          {
            code: "AMOUNT_SENSITIVITY",
            label: "Amount Threshold Sensitivity",
            description: `Transfer value of ₹${amount.toLocaleString('en-IN')} matches risk profile typologies.`,
            contribution: Math.floor(score * 0.35),
            severity: "high",
            evidence: `Historical baseline average: ₹1,24,000.`,
          },
        ],
        timeline: [
          {
            id: `tl-${Date.now()}-1`,
            timestamp: new Date(Date.now() - 1000 * 60).toISOString(),
            title: "Transaction Initiated",
            description: `Transfer dispatched via ${channel} network.`,
            type: "transaction",
          },
          {
            id: `tl-${Date.now()}-2`,
            timestamp: tx.timestamp,
            title: `Finverse Orchestrator Evaluated: Risk ${score}`,
            description: `Action assigned: ${recommendedAction}.`,
            type: "rule_trigger",
          },
        ],
      };

      // Also create an Alert
      const alert: Alert = {
        id: `ALT-2026-${this.alertCounter++}`,
        alert_type: score >= 85 ? "Critical Risk Pattern Detected" : "Suspicious Velocity Deviation",
        transaction_id: txId,
        account_id: sender.id,
        risk_score: score,
        severity: riskLevel,
        detected_at: tx.timestamp,
        explanation: `${sender.name} transferred ₹${amount.toLocaleString('en-IN')} to ${receiver.name}. Risk Score: ${score}/100.`,
        status: "new",
      };
      this.alerts.unshift(alert);
      if (this.alerts.length > 50) this.alerts.pop();
      this.alertListeners.forEach((l) => l(alert));
    }

    // Broadcast new transaction to listeners
    this.txListeners.forEach((l) => l(tx));
    return tx;
  }

  // --- Dashboard Summary ---
  public getDashboardSummary(): DashboardSummary {
    const total_transactions = this.transactions.length + 84200; // Realistic volume metric
    const high_risk_alerts = this.alerts.filter((a) => a.severity === "high" || a.severity === "critical").length + 42;
    const cases_under_investigation = this.cases.filter((c) => c.status === "open" || c.status === "in_review").length;
    const avg_detection_latency_ms = 16.4;

    // Calculate actual distribution from current transaction pool
    let lowCount = 0;
    let medCount = 0;
    let highCount = 0;
    let critCount = 0;

    let allowCount = 0;
    let stepUpCount = 0;
    let manualCount = 0;
    let holdCount = 0;

    this.transactions.forEach((tx) => {
      const score = tx.risk_score || 0;
      if (score >= 85) critCount++;
      else if (score >= 65) highCount++;
      else if (score >= 35) medCount++;
      else lowCount++;

      if (tx.recommended_action === "hold_for_review") holdCount++;
      else if (tx.recommended_action === "manual_review") manualCount++;
      else if (tx.recommended_action === "step_up_verification") stepUpCount++;
      else allowCount++;
    });

    const totalInPool = this.transactions.length || 1;

    const risk_distribution = [
      {
        range: "0-34",
        label: "Low Risk",
        count: lowCount + 64000,
        percentage: Number((((lowCount + 64000) / 84200) * 100).toFixed(1)),
        color: "#10B981",
      },
      {
        range: "35-64",
        label: "Medium Risk",
        count: medCount + 12500,
        percentage: Number((((medCount + 12500) / 84200) * 100).toFixed(1)),
        color: "#F59E0B",
      },
      {
        range: "65-84",
        label: "High Risk",
        count: highCount + 5400,
        percentage: Number((((highCount + 5400) / 84200) * 100).toFixed(1)),
        color: "#F97316",
      },
      {
        range: "85-100",
        label: "Critical Risk",
        count: critCount + 2300,
        percentage: Number((((critCount + 2300) / 84200) * 100).toFixed(1)),
        color: "#EF4444",
      },
    ];

    const decisions_breakdown = [
      {
        action: "allow" as RecommendedAction,
        label: "Allowed (Low Risk)",
        count: allowCount + 68000,
        percentage: 80.8,
        color: "#10B981",
      },
      {
        action: "step_up_verification" as RecommendedAction,
        label: "Step-Up 2FA",
        count: stepUpCount + 8900,
        percentage: 10.6,
        color: "#F59E0B",
      },
      {
        action: "manual_review" as RecommendedAction,
        label: "Manual Review",
        count: manualCount + 4800,
        percentage: 5.7,
        color: "#F97316",
      },
      {
        action: "hold_for_review" as RecommendedAction,
        label: "Hold for AML",
        count: holdCount + 2500,
        percentage: 2.9,
        color: "#EF4444",
      },
    ];

    const volume_over_time = [
      { time: "06:00", count: 4200, flagged_count: 140, total_volume: 820000 },
      { time: "08:00", count: 6800, flagged_count: 210, total_volume: 1450000 },
      { time: "10:00", count: 11200, flagged_count: 480, total_volume: 3100000 },
      { time: "12:00", count: 14500, flagged_count: 620, total_volume: 4250000 },
      { time: "14:00", count: 16800, flagged_count: 790, total_volume: 5120000 },
      { time: "16:00", count: 15100, flagged_count: 710, total_volume: 4680000 },
      { time: "18:00", count: 10200, flagged_count: 390, total_volume: 2950000 },
      { time: "20:00", count: 5400, flagged_count: 180, total_volume: 1320000 },
    ];

    return {
      total_transactions,
      high_risk_alerts,
      cases_under_investigation,
      avg_detection_latency_ms,
      trends: {
        total_transactions: "+12.4% vs last hour",
        high_risk_alerts: "+4 new in last 15m",
        cases_under_investigation: "3 pending review",
        avg_detection_latency_ms: "-2.1ms performance gain",
      },
      risk_distribution,
      decisions_breakdown,
      volume_over_time,
    };
  }

  // --- Transactions Queries ---
  public getTransactions(params?: {
    search?: string;
    risk_level?: string;
    recommended_action?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): { items: Transaction[]; total: number } {
    let filtered = [...this.transactions];

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (tx) =>
          tx.transaction_id.toLowerCase().includes(q) ||
          tx.sender_account_id.toLowerCase().includes(q) ||
          tx.receiver_account_id.toLowerCase().includes(q) ||
          (tx.sender_name && tx.sender_name.toLowerCase().includes(q)) ||
          (tx.receiver_name && tx.receiver_name.toLowerCase().includes(q))
      );
    }

    if (params?.risk_level && params.risk_level !== "all") {
      filtered = filtered.filter((tx) => tx.risk_level === params.risk_level);
    }

    if (params?.recommended_action && params.recommended_action !== "all") {
      filtered = filtered.filter((tx) => tx.recommended_action === params.recommended_action);
    }

    if (params?.status && params.status !== "all") {
      filtered = filtered.filter((tx) => tx.status === params.status);
    }

    const total = filtered.length;
    const offset = params?.offset || 0;
    const limit = params?.limit || 20;
    const items = filtered.slice(offset, offset + limit);

    return { items, total };
  }

  public getTransactionById(id: string): Transaction | null {
    const tx = this.transactions.find((t) => t.transaction_id === id);
    return tx || null;
  }

  public getRiskAssessment(txId: string): RiskAssessment {
    if (this.riskAssessments[txId]) {
      return this.riskAssessments[txId];
    }

    const tx = this.getTransactionById(txId);
    const score = tx?.risk_score ?? 35;
    const level = tx?.risk_level ?? getRiskLevelFromScore(score);
    const action = tx?.recommended_action ?? "allow";

    const syntheticAssessment: RiskAssessment = {
      transaction_id: txId,
      risk_score: score,
      risk_level: level,
      recommended_action: action,
      assessed_at: tx?.timestamp || new Date().toISOString(),
      model_version: "Finverse-XGBoost-GNN-v3.4.1",
      confidence: 0.912,
      risk_factors: [
        {
          code: "BASELINE_PROFILE",
          label: "Statistical Deviation Score",
          description: `Transaction evaluated against 90-day entity baseline. Risk assessment computed at ${score}/100.`,
          contribution: score,
          severity: level,
          evidence: `Account history shows normal dispersion. Calculated confidence: 91.2%.`,
        },
      ],
      timeline: [
        {
          id: `tl-${txId}-1`,
          timestamp: tx?.timestamp || new Date().toISOString(),
          title: "Transaction Received",
          description: `Dispatched amount of ₹${tx?.amount?.toLocaleString('en-IN') || "0"} via ${tx?.channel || "NEFT"}.`,
          type: "transaction",
        },
      ],
    };

    this.riskAssessments[txId] = syntheticAssessment;
    return syntheticAssessment;
  }

  public recordAnalystDecision(
    txId: string,
    action: RecommendedAction,
    decisionType: "approve" | "escalate" | "block",
    notes: string
  ): Transaction {
    const tx = this.transactions.find((t) => t.transaction_id === txId);
    if (!tx) throw new Error("Transaction not found");

    if (decisionType === "approve") {
      tx.status = "cleared";
      tx.recommended_action = "allow";
    } else if (decisionType === "block") {
      tx.status = "blocked";
      tx.recommended_action = "hold_for_review";
    } else {
      tx.status = "under_investigation";
      tx.recommended_action = "manual_review";
    }

    // Append to assessment timeline
    const assessment = this.getRiskAssessment(txId);
    if (!assessment.timeline) assessment.timeline = [];
    assessment.timeline.push({
      id: `tl-decision-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: `Analyst Action: ${decisionType.toUpperCase()}`,
      description: `Action applied by current analyst: ${notes || "No notes provided."}`,
      type: "analyst_action",
    });

    return { ...tx };
  }

  // --- Network Explorer ---
  public getNetworkGraph(accountId?: string): NetworkGraphData {
    if (!accountId) {
      return { ...this.networkGraph };
    }

    // Filter around specific account and 1-2 hop neighbors
    const target = accountId.toUpperCase();
    const connectedEdges = this.networkGraph.edges.filter(
      (e) => e.source.toUpperCase() === target || e.target.toUpperCase() === target
    );

    const neighborIds = new Set<string>();
    neighborIds.add(target);
    connectedEdges.forEach((e) => {
      neighborIds.add(e.source);
      neighborIds.add(e.target);
    });

    const filteredNodes = this.networkGraph.nodes.filter((n) => neighborIds.has(n.id));

    return {
      nodes: filteredNodes,
      edges: connectedEdges,
      suspicious_cycle_ids: this.networkGraph.suspicious_cycle_ids?.filter((id) => neighborIds.has(id)),
      explanation: `Network focused on ${accountId}. Identified ${connectedEdges.length} connected flows across ${filteredNodes.length} counterparties.`,
    };
  }

  // --- Cases ---
  public getCases(filter?: { status?: string; search?: string }): Case[] {
    let list = [...this.cases];
    if (filter?.status && filter.status !== "all") {
      list = list.filter((c) => c.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.case_id.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.assigned_analyst.toLowerCase().includes(q)
      );
    }
    return list;
  }

  public getCaseById(id: string): Case | null {
    const c = this.cases.find((item) => item.id === id || item.case_id === id);
    return c || null;
  }

  public createCase(params: {
    title: string;
    case_type: Case["case_type"];
    severity: RiskLevel;
    related_accounts: string[];
    related_transactions: string[];
    summary: string;
    assigned_analyst?: string;
  }): Case {
    const id = `CASE-2026-${String(this.caseCounter++).padStart(3, "0")}`;
    const newCase: Case = {
      id,
      case_id: id,
      title: params.title,
      case_type: params.case_type,
      severity: params.severity,
      status: "open",
      assigned_analyst: params.assigned_analyst || "Sarah Chen (Lead AML)",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      related_accounts: params.related_accounts || [],
      related_transactions: params.related_transactions || [],
      summary: params.summary,
      notes: [
        {
          id: `note-${Date.now()}`,
          author: "Current Analyst",
          timestamp: new Date().toISOString(),
          content: `Case created automatically from investigation workbench.`,
        },
      ],
    };

    this.cases.unshift(newCase);
    return newCase;
  }

  public updateCase(
    id: string,
    updates: Partial<Pick<Case, "status" | "assigned_analyst" | "severity">>
  ): Case {
    const c = this.getCaseById(id);
    if (!c) throw new Error("Case not found");

    if (updates.status) c.status = updates.status;
    if (updates.assigned_analyst) c.assigned_analyst = updates.assigned_analyst;
    if (updates.severity) c.severity = updates.severity;
    c.updated_at = new Date().toISOString();

    return { ...c };
  }

  public addCaseNote(caseId: string, content: string, author: string = "Current Analyst"): Case {
    const c = this.getCaseById(caseId);
    if (!c) throw new Error("Case not found");

    const note = {
      id: `note-${Date.now()}`,
      author,
      timestamp: new Date().toISOString(),
      content,
    };
    c.notes.unshift(note);
    c.updated_at = new Date().toISOString();

    return { ...c };
  }

  // --- Alerts ---
  public getAlerts(): Alert[] {
    return [...this.alerts];
  }

  // --- Analytics ---
  public getAnalyticsMetrics(): ModelEvaluationMetrics {
    return { ...MOCK_MODEL_METRICS };
  }
}

export const mockService = new MockDataService();
