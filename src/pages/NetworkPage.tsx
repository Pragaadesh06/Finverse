import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { networkService } from "../services/networkService";
import { NetworkGraphData, NetworkNode, NetworkEdge } from "../types";
import { CytoscapeGraph } from "../components/network/CytoscapeGraph";
import { AccountDetailDrawer } from "../components/network/AccountDetailDrawer";
import { TransferDetailModal } from "../components/network/TransferDetailModal";
import { SearchBar } from "../components/ui/SearchBar";
import { Button } from "../components/ui/Button";
import { AlertOctagon, RefreshCw } from "lucide-react";

export const NetworkPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialAccount = searchParams.get("account") || "";

  const [graphData, setGraphData] = useState<NetworkGraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<NetworkEdge | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<"all" | "cycle" | "smurf" | "high_risk">("all");
  const [minAmount, setMinAmount] = useState<number>(0);
  const [accountQuery, setAccountQuery] = useState(initialAccount);

  const fetchGraph = async () => {
    setIsLoading(true);
    try {
      const data = await networkService.getNetworkGraph(accountQuery || undefined);
      setGraphData(data);
    } catch {
      // handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [accountQuery]);

  // Filter nodes and edges based on preset and minimum amount
  const getFilteredGraph = () => {
    if (!graphData) return { nodes: [], edges: [] };

    let nodes = [...graphData.nodes];
    let edges = [...graphData.edges];

    // Min Amount Filter
    if (minAmount > 0) {
      edges = edges.filter((e) => e.amount >= minAmount);
      const activeIds = new Set<string>();
      edges.forEach((e) => {
        activeIds.add(e.source);
        activeIds.add(e.target);
      });
      nodes = nodes.filter((n) => activeIds.has(n.id));
    }

    // Presets
    if (selectedPreset === "cycle") {
      const cycleIds = new Set(graphData.suspicious_cycle_ids || []);
      nodes = nodes.filter((n) => cycleIds.has(n.id));
      edges = edges.filter((e) => cycleIds.has(e.source) && cycleIds.has(e.target));
    } else if (selectedPreset === "smurf") {
      const smurfIds = new Set(["ACC-5120", "ACC-7721", "ACC-2201", "ACC-5501"]);
      nodes = nodes.filter((n) => smurfIds.has(n.id));
      edges = edges.filter((e) => smurfIds.has(e.source) || smurfIds.has(e.target));
    } else if (selectedPreset === "high_risk") {
      nodes = nodes.filter((n) => n.risk_level === "critical" || n.risk_level === "high");
      const highIds = new Set(nodes.map((n) => n.id));
      edges = edges.filter((e) => highIds.has(e.source) || highIds.has(e.target));
    }

    return { nodes, edges };
  };

  const filtered = getFilteredGraph();

  return (
    <div className="space-y-6">
      {/* Control Toolbar */}
      <div
        className="p-4 sm:p-5 rounded-2xl space-y-4 transition-all"
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 1px 3px rgba(30,77,53,0.04)",
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2
                className="text-lg font-bold tracking-tight"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: "var(--color-ink)",
                }}
              >
                AML Network Explorer
              </h2>
              <span
                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--color-gold-muted)",
                  color: "var(--color-gold)",
                  border: "1px solid rgba(184,134,11,0.25)",
                }}
              >
                Cytoscape.js Directed
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-2)" }}>
              Visualize entity relationships, detect circular layering rings, and inspect financial contagion.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Account Search */}
            <div className="w-56">
              <SearchBar
                value={accountQuery}
                onChangeValue={setAccountQuery}
                placeholder="Search Account (e.g. ACC-8491)"
                className="py-1"
              />
            </div>

            {/* Topology Preset Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold" style={{ color: "var(--color-ink-2)" }}>
                Preset:
              </span>
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value as any)}
                className="text-xs rounded-xl px-2.5 py-2 font-medium focus:outline-none cursor-pointer"
                style={{
                  background: "var(--color-bg-soft)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-ink)",
                }}
              >
                <option value="all">Full Topology (All Entities)</option>
                <option value="cycle">🚨 Circular Layering Ring (4 Nodes)</option>
                <option value="smurf">⚠️ Smurfing / Structuring Subgraph</option>
                <option value="high_risk">High & Critical Entities</option>
              </select>
            </div>

            {/* Min Amount Filter (INR) */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold" style={{ color: "var(--color-ink-2)" }}>
                Min Flow:
              </span>
              <select
                value={minAmount}
                onChange={(e) => setMinAmount(Number(e.target.value))}
                className="text-xs rounded-xl px-2.5 py-2 font-medium focus:outline-none cursor-pointer"
                style={{
                  background: "var(--color-bg-soft)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-ink)",
                }}
              >
                <option value={0}>All Amounts</option>
                <option value={10000}>≥ ₹10,000</option>
                <option value={50000}>≥ ₹50,000</option>
                <option value={100000}>≥ ₹1,00,000</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchGraph}
              leftIcon={<RefreshCw className={isLoading ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5"} />}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Cycle Explanation Banner */}
        {graphData?.explanation && (
          <div
            className="p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-fade-in"
            style={{
              background: "rgba(168, 25, 15, 0.08)",
              border: "1px solid rgba(168, 25, 15, 0.25)",
              color: "#A8190F",
            }}
          >
            <AlertOctagon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <strong className="font-bold">Algorithmic Typology Insight:</strong>{" "}
              {graphData.explanation}
            </div>
          </div>
        )}
      </div>

      {/* Main Interactive Graph Canvas */}
      <div className="relative">
        {isLoading ? (
          <div
            className="w-full h-[580px] rounded-2xl flex items-center justify-center"
            style={{
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="text-center space-y-3">
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
                style={{ borderColor: "var(--color-accent-2)", borderTopColor: "transparent" }}
              />
              <p className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
                Rendering Cytoscape entity topology…
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-[620px]">
            <CytoscapeGraph
              nodes={filtered.nodes}
              edges={filtered.edges}
              suspiciousCycleIds={graphData?.suspicious_cycle_ids}
              onSelectNode={setSelectedNode}
              onSelectEdge={setSelectedEdge}
            />
          </div>
        )}

        {/* Node Detail Slide-Over Drawer */}
        <AccountDetailDrawer
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />

        {/* Edge Detail Modal */}
        <TransferDetailModal
          edge={selectedEdge}
          onClose={() => setSelectedEdge(null)}
        />
      </div>
    </div>
  );
};

export default NetworkPage;
