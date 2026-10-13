import React, { useEffect, useRef, useState } from "react";
import cytoscape, { Core, EventObject } from "cytoscape";
import { NetworkNode, NetworkEdge } from "../../types";
import { formatCurrency, getRiskColor } from "../../lib/utils";
import { useTheme } from "../../contexts/ThemeContext";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
} from "lucide-react";

interface CytoscapeGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  suspiciousCycleIds?: string[];
  onSelectNode: (node: NetworkNode | null) => void;
  onSelectEdge: (edge: NetworkEdge | null) => void;
  highlightCycle?: boolean;
}

export const CytoscapeGraph: React.FC<CytoscapeGraphProps> = ({
  nodes,
  edges,
  suspiciousCycleIds = [],
  onSelectNode,
  onSelectEdge,
  highlightCycle = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const { theme } = useTheme();
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [layoutName, setLayoutName] = useState<"cose" | "circle" | "concentric">("cose");

  // Old-money theme palette for Cytoscape elements
  const isDark = theme === "dark";
  const nodeBorderColor = isDark ? "#1F2E24" : "#FFFDF8";
  const labelColor = isDark ? "#F0EBD8" : "#1A1A14";
  const labelBgColor = isDark ? "#141B18" : "#FAF7F0";
  const edgeLineColor = isDark ? "#3A4D40" : "#C8BC9E";
  const edgeArrowColor = isDark ? "#5D9B78" : "#8C8776";
  const edgeLabelColor = isDark ? "#A8A090" : "#5D5A4E";
  const edgeLabelBg = isDark ? "#1A2420" : "#FAF7F0";
  const selectionColor = isDark ? "#D4A017" : "#B8860B";

  useEffect(() => {
    if (!containerRef.current) return;

    // Build cytoscape elements
    const elements: cytoscape.ElementDefinition[] = [
      ...nodes.map((node) => {
        const isCycleNode = suspiciousCycleIds.includes(node.id);
        const size = Math.max(38, Math.min(68, 36 + (node.transaction_count || 1) * 0.7));
        const color = getRiskColor(node.risk_level);

        return {
          group: "nodes" as const,
          data: {
            id: node.id,
            label: node.label,
            account_holder: node.account_holder,
            risk_level: node.risk_level,
            transaction_count: node.transaction_count,
            color,
            size,
            isCycleNode,
            nodeData: node,
          },
        };
      }),
      ...edges.map((edge) => {
        const isCycleEdge = edge.is_suspicious_path;
        return {
          group: "edges" as const,
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            amount: edge.amount,
            currency: edge.currency,
            formattedAmount: formatCurrency(edge.amount, edge.currency, true),
            isCycleEdge,
            edgeData: edge,
          },
        };
      }),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "background-color": "data(color)",
            width: "data(size)",
            height: "data(size)",
            color: labelColor,
            "font-size": "10px",
            "font-weight": "bold",
            "text-valign": "bottom",
            "text-margin-y": 6,
            "text-background-color": labelBgColor,
            "text-background-opacity": 0.9,
            "text-background-padding": "3px",
            "text-background-shape": "roundrectangle",
            "border-width": 2.5,
            "border-color": nodeBorderColor,
            "border-opacity": 0.95,
          },
        },
        {
          selector: "node[?isCycleNode]",
          style: {
            "border-width": 4,
            "border-color": "#A8190F",
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 4.5,
            "border-color": selectionColor,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": edgeLineColor,
            "target-arrow-color": edgeArrowColor,
            "target-arrow-shape": "triangle",
            "arrow-scale": 1.2,
            "curve-style": "bezier",
            label: "data(formattedAmount)",
            "font-size": "9px",
            "font-family": "monospace",
            color: edgeLabelColor,
            "text-background-color": edgeLabelBg,
            "text-background-opacity": 0.92,
            "text-background-padding": "2px",
            "text-background-shape": "roundrectangle",
            "text-rotation": "autorotate",
          },
        },
        {
          selector: "edge[?isCycleEdge]",
          style: {
            width: 3.5,
            "line-color": "#A8190F",
            "target-arrow-color": "#A8190F",
            "line-style": "dashed",
            color: "#A8190F",
            "font-weight": "bold",
          },
        },
        {
          selector: "edge:selected",
          style: {
            width: 4,
            "line-color": selectionColor,
            "target-arrow-color": selectionColor,
          },
        },
        {
          selector: ".faded",
          style: {
            opacity: 0.2,
          },
        },
        {
          selector: ".highlighted",
          style: {
            opacity: 1,
            "line-color": selectionColor,
            "target-arrow-color": selectionColor,
            "border-color": selectionColor,
          },
        },
      ],
      layout: {
        name: layoutName,
        animate: true,
        animationDuration: 500,
        padding: 50,
      } as any,
    });

    cyRef.current = cy;

    // Node selection
    cy.on("tap", "node", (evt: EventObject) => {
      const node = evt.target;
      setSelectedElementId(node.id());
      onSelectNode(node.data("nodeData"));
      onSelectEdge(null);

      // Highlight neighbourhood
      cy.elements().removeClass("highlighted faded");
      const neighborhood = node.neighborhood().add(node);
      cy.elements().difference(neighborhood).addClass("faded");
      neighborhood.addClass("highlighted");
    });

    // Edge selection
    cy.on("tap", "edge", (evt: EventObject) => {
      const edge = evt.target;
      setSelectedElementId(edge.id());
      onSelectEdge(edge.data("edgeData"));
      onSelectNode(null);

      // Highlight connected
      cy.elements().removeClass("highlighted faded");
      const connected = edge.connectedNodes().add(edge);
      cy.elements().difference(connected).addClass("faded");
      connected.addClass("highlighted");
    });

    // Tap background (unselect)
    cy.on("tap", (evt: EventObject) => {
      if (evt.target === cy) {
        setSelectedElementId(null);
        onSelectNode(null);
        onSelectEdge(null);
        cy.elements().removeClass("highlighted faded");
      }
    });

    return () => {
      cy.destroy();
    };
  }, [nodes, edges, layoutName, suspiciousCycleIds, theme]);

  // Handle cycle highlight toggle
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (highlightCycle && suspiciousCycleIds.length > 0) {
      const cycleNodes = cy.nodes().filter((node) => suspiciousCycleIds.includes(node.id()));
      const cycleEdges = cy.edges().filter((edge) => edge.data("isCycleEdge"));
      const cycleElements = cycleNodes.union(cycleEdges);

      cy.elements().removeClass("highlighted faded");
      cy.elements().difference(cycleElements).addClass("faded");
      cycleElements.addClass("highlighted");
    } else {
      cy.elements().removeClass("highlighted faded");
    }
  }, [highlightCycle, suspiciousCycleIds]);

  // Zoom controls
  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom({
        level: cyRef.current.zoom() * 1.25,
        renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 },
      });
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom({
        level: cyRef.current.zoom() * 0.8,
        renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 },
      });
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
    }
  };

  const handleResetLayout = () => {
    if (cyRef.current) {
      cyRef.current.layout({
        name: layoutName,
        animate: true,
        animationDuration: 500,
        padding: 50,
      } as any).run();
    }
  };

  return (
    <div
      className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Graph Toolbar */}
      <div
        className="absolute top-4 right-4 z-10 flex items-center gap-1.5 p-1.5 rounded-xl shadow-md backdrop-blur-md"
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-lg transition-colors hover:scale-105"
          style={{ color: "var(--color-ink-2)" }}
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-lg transition-colors hover:scale-105"
          style={{ color: "var(--color-ink-2)" }}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFit}
          className="p-1.5 rounded-lg transition-colors hover:scale-105"
          style={{ color: "var(--color-ink-2)" }}
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="w-px h-4 mx-1" style={{ background: "var(--color-border)" }} />
        <button
          onClick={handleResetLayout}
          className="p-1.5 rounded-lg transition-colors hover:scale-105"
          style={{ color: "var(--color-ink-2)" }}
          title="Reset Graph Layout"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="w-px h-4 mx-1" style={{ background: "var(--color-border)" }} />
        {/* Layout Switcher */}
        <select
          value={layoutName}
          onChange={(e) => setLayoutName(e.target.value as any)}
          className="text-xs rounded-lg px-2 py-1 font-medium focus:outline-none cursor-pointer"
          style={{
            background: "var(--color-bg-soft)",
            border: "1px solid var(--color-border)",
            color: "var(--color-ink)",
          }}
        >
          <option value="cose">Force-Directed</option>
          <option value="concentric">Concentric Rings</option>
          <option value="circle">Circular Topology</option>
        </select>
      </div>

      {/* Legend Overlay */}
      <div
        className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-3 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md text-xs"
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-red-200" />
          <span style={{ color: "var(--color-ink-2)" }}>Critical Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span style={{ color: "var(--color-ink-2)" }}>High Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <span style={{ color: "var(--color-ink-2)" }}>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
          <span style={{ color: "var(--color-ink-2)" }}>Low</span>
        </div>
        <div className="w-px h-3" style={{ background: "var(--color-border)" }} />
        <div className="flex items-center gap-1.5 font-semibold" style={{ color: "#A8190F" }}>
          <span className="w-3 h-0.5 border-t-2 border-dashed border-red-600" />
          <span>Suspicious Cycle / Path</span>
        </div>
      </div>

      {/* Cytoscape Canvas Container */}
      <div ref={containerRef} className="w-full h-full flex-1" />
    </div>
  );
};

export default CytoscapeGraph;
