import React, { useState, useEffect, useCallback } from "react";
import { Agent, LayoutNode, BridgeConfig } from "./types";
import {
  generateId,
  splitLeafInTree,
  closeLeafInTree,
  updateAgentInTree,
  updateSizesInTree,
  getAllLeafIds,
} from "./utils/layout";
import Dashboard from "./components/Dashboard";
import AgentsDrawer from "./components/AgentsDrawer";
import InstructionDialog from "./components/InstructionDialog";
import {
  Terminal,
  Settings,
  HelpCircle,
  Wifi,
  WifiOff,
  Sliders,
  ChevronDown,
  LayoutGrid,
  RefreshCw,
  Key,
} from "lucide-react";

const DEFAULT_AGENTS: Agent[] = [
  {
    id: "agent-claude-code",
    name: "Claude Code",
    command: "claude",
    args: [],
    env: {},
    icon: "Bot",
    color: "#ea580c",
    builtin: true,
  },
  {
    id: "agent-local-shell",
    name: "Local Bash Shell",
    command: "bash",
    args: [],
    env: { PS1: "\\u@\\h:\\w$ " },
    icon: "Terminal",
    color: "#10b981",
    builtin: true,
  },
  {
    id: "agent-openclaude",
    name: "OpenClaude AI",
    command: "npx",
    args: ["-y", "openclaude"],
    env: {},
    icon: "Sparkles",
    color: "#3b82f6",
    builtin: true,
  },
];

const DEFAULT_LAYOUT: LayoutNode = {
  type: "leaf",
  id: "pane-root-init",
  agentId: "agent-claude-code",
};

export default function App() {
  const [isHydrated, setIsHydrated] = useState(false);

  // Core application states
  const [agents, setAgents] = useState<Agent[]>([]);
  const [layout, setLayout] = useState<LayoutNode>(DEFAULT_LAYOUT);
  const [bridgeUrl, setBridgeUrl] = useState("ws://127.0.0.1:8787");
  const [bridgeToken, setBridgeToken] = useState("");
  const [activePaneId, setActivePaneId] = useState<string | null>(null);

  // UI elements triggers
  const [isAgentsDrawerOpen, setIsAgentsDrawerOpen] = useState(false);
  const [isSetupHelpOpen, setIsSetupHelpOpen] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);

  // 1. Initial State Hydration under useEffect
  useEffect(() => {
    // Agents
    const localAgents = localStorage.getItem("dashboard.agents");
    if (localAgents) {
      try {
        setAgents(JSON.parse(localAgents));
      } catch (err) {
        setAgents(DEFAULT_AGENTS);
      }
    } else {
      setAgents(DEFAULT_AGENTS);
      localStorage.setItem("dashboard.agents", JSON.stringify(DEFAULT_AGENTS));
    }

    // Tiling Layout config
    const localLayout = localStorage.getItem("dashboard.layout");
    if (localLayout) {
      try {
        const parsed = JSON.parse(localLayout);
        setLayout(parsed);
        // Find active selection
        const leaves = getAllLeafIds(parsed);
        if (leaves.length > 0) {
          setActivePaneId(leaves[0]);
        }
      } catch (err) {
        setLayout(DEFAULT_LAYOUT);
        setActivePaneId(DEFAULT_LAYOUT.id);
      }
    } else {
      setLayout(DEFAULT_LAYOUT);
      setActivePaneId(DEFAULT_LAYOUT.id);
      localStorage.setItem("dashboard.layout", JSON.stringify(DEFAULT_LAYOUT));
    }

    // Bridge details
    const localUrl = localStorage.getItem("dashboard.bridgeUrl");
    if (localUrl) {
      setBridgeUrl(localUrl);
    }

    const localToken = localStorage.getItem("dashboard.bridgeToken");
    if (localToken) {
      setBridgeToken(localToken);
    } else {
      // Auto-generate safe token
      const randomSecret = "cli_token_" + Math.random().toString(36).substring(2, 9);
      setBridgeToken(randomSecret);
      localStorage.setItem("dashboard.bridgeToken", randomSecret);
    }

    setIsHydrated(true);
  }, []);

  // Sync changes back to localStorage
  const saveAgentsToStorage = (updated: Agent[]) => {
    setAgents(updated);
    localStorage.setItem("dashboard.agents", JSON.stringify(updated));
  };

  const saveLayoutToStorage = (updated: LayoutNode) => {
    setLayout(updated);
    localStorage.setItem("dashboard.layout", JSON.stringify(updated));
  };

  const handleUpdateBridgeUrl = (val: string) => {
    setBridgeUrl(val);
    localStorage.setItem("dashboard.bridgeUrl", val);
  };

  const handleUpdateBridgeToken = (val: string) => {
    setBridgeToken(val);
    localStorage.setItem("dashboard.bridgeToken", val);
  };

  // 2. Tiling operation callbacks
  const handleSplit = useCallback(
    (paneId: string, direction: "horizontal" | "vertical", agentId: string) => {
      const newPaneId = `pane-${generateId()}`;
      const newLayout = splitLeafInTree(layout, paneId, direction, newPaneId, agentId);
      saveLayoutToStorage(newLayout);
      setActivePaneId(newPaneId); // focus newly spawned leaf
    },
    [layout]
  );

  const handleClose = useCallback(
    (paneId: string) => {
      const leaves = getAllLeafIds(layout);
      if (leaves.length <= 1) {
        // Falling back to default layout instead of empty screen
        const freshId = `pane-${generateId()}`;
        const newRootLayout: LayoutNode = {
          type: "leaf",
          id: freshId,
          agentId: agents[0]?.id || "agent-claude-code",
        };
        saveLayoutToStorage(newRootLayout);
        setActivePaneId(freshId);
        return;
      }

      const newLayout = closeLeafInTree(layout, paneId);
      if (newLayout) {
        saveLayoutToStorage(newLayout);
        // Retrack remaining leaf IDs
        const remaining = getAllLeafIds(newLayout);
        if (remaining.length > 0) {
          // If deleted active node, focus the first remaining
          if (activePaneId === paneId) {
            setActivePaneId(remaining[0]);
          }
        }
      }
    },
    [layout, activePaneId, agents]
  );

  const handleAgentChange = useCallback(
    (paneId: string, agentId: string) => {
      const newLayout = updateAgentInTree(layout, paneId, agentId);
      saveLayoutToStorage(newLayout);
    },
    [layout]
  );

  const handleResizeLayout = useCallback(
    (nodeId: string, sizes: number[]) => {
      const newLayout = updateSizesInTree(layout, nodeId, sizes);
      saveLayoutToStorage(newLayout);
    },
    [layout]
  );

  // 3. Agent Library handlers
  const handleSaveAgent = (saved: Agent) => {
    const exists = agents.some((a) => a.id === saved.id);
    let updated: Agent[];
    if (exists) {
      updated = agents.map((a) => (a.id === saved.id ? saved : a));
    } else {
      updated = [...agents, saved];
    }
    saveAgentsToStorage(updated);
  };

  const handleDeleteAgent = (id: string) => {
    const updated = agents.filter((a) => a.id !== id);
    saveAgentsToStorage(updated);

    // Loop through layout to replace deleted reference paths with first default
    const firstAgentId = updated[0]?.id || "agent-claude-code";
    const sanitizeLayoutReference = (node: LayoutNode): LayoutNode => {
      if (node.type === "leaf") {
        if (node.agentId === id) {
          return { ...node, agentId: firstAgentId };
        }
        return node;
      }
      return {
        ...node,
        children: node.children.map(sanitizeLayoutReference),
      };
    };
    saveLayoutToStorage(sanitizeLayoutReference(layout));
  };

  const handleResetAgents = () => {
    if (window.confirm("Are you sure you want to reset all built-in agent presets back to defaults?")) {
      saveAgentsToStorage(DEFAULT_AGENTS);
    }
  };

  if (!isHydrated) {
    return (
      <div className="w-screen h-screen bg-[#0c0c0d] flex items-center justify-center text-gray-500 font-mono text-xs unicode-bidi">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-orange-500" />
        Initialising shell environment...
      </div>
    );
  }

  const bridgeConfig: BridgeConfig = {
    url: bridgeUrl,
    token: bridgeToken,
  };

  return (
    <div className="w-screen h-screen flex flex-col font-sans bg-[#0c0c0d] text-gray-200 overflow-hidden">
      {/* 1. Main Terminal System Menu Bar */}
      <header className="h-12 bg-[#111112] border-b border-[#2d2d2d] flex items-center justify-between px-5 select-none shrink-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-orange-600/10 border border-orange-500/20 px-2.5 py-1 rounded-sm">
            <Terminal className="w-4 h-4 text-orange-500 animate-pulse" />
            <span className="text-xs font-mono font-black tracking-wider text-orange-400">AGENTS.OS</span>
          </div>
          <span className="text-xs font-mono text-gray-500 hidden sm:inline">v2.0-tiling</span>
        </div>

        {/* Local Bridge Connector Control panel */}
        <div className="flex items-center space-x-2.5 max-w-xl flex-1 justify-end sm:justify-center mx-4">
          <div className="flex items-center bg-[#151516] p-1.5 rounded-sm border border-[#2d2d2d] space-x-2">
            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 ml-1.5 animate-pulse" />
            
            {/* Bridge URL direct text input */}
            <input
              type="text"
              value={bridgeUrl}
              onChange={(e) => handleUpdateBridgeUrl(e.target.value)}
              placeholder="ws://localhost:8787"
              className="bg-transparent border-0 font-mono text-xs text-gray-300 w-32 focus:outline-hidden focus:ring-0 select-text"
              title="Local Bridge Entrypoint URL"
            />
            
            {/* Toggle show token identifier */}
            <div className="h-4 w-px bg-[#2d2d2d]" />
            
            <button
              onClick={() => setShowTokenInput((prev) => !prev)}
              className={`p-1 rounded text-gray-500 hover:text-white transition-all ${
                showTokenInput ? "bg-[#2d2d2d] text-orange-400" : ""
              }`}
              title="Configure Security Token"
            >
              <Key className="w-3.5 h-3.5" />
            </button>

            {showTokenInput && (
              <input
                type="text"
                value={bridgeToken}
                onChange={(e) => handleUpdateBridgeToken(e.target.value)}
                placeholder="Active Token"
                className="bg-[#0c0c0d] border border-[#2d2d2d] rounded px-1.5 py-0.5 font-mono text-[10px] text-orange-400 w-24 focus:outline-hidden focus:border-orange-500 select-text"
                title="Local Bridge Token Verification"
              />
            )}
          </div>
        </div>

        {/* Main Launcher Triggers */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsSetupHelpOpen(true)}
            className="flex items-center space-x-1.5 bg-[#1c1c1e] hover:bg-[#2d2d2d] border border-[#2d2d2d] rounded px-3 py-1.5 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
            <span className="font-mono text-[11px] font-semibold hidden md:inline">Bridge Setup</span>
          </button>

          <button
            onClick={() => setIsAgentsDrawerOpen(true)}
            className="flex items-center space-x-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-[#3d3d3d] text-white rounded px-3 py-1.5 text-xs transition-all cursor-pointer font-mono select-none"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold hidden md:inline">Manage Agents</span>
          </button>
        </div>
      </header>

      {/* 2. Interactive Tiling Workspaces Terminal Dashboard Canvas */}
      <Dashboard
        layout={layout}
        agents={agents}
        bridgeConfig={bridgeConfig}
        activePaneId={activePaneId}
        setActivePaneId={setActivePaneId}
        onSplit={handleSplit}
        onClose={handleClose}
        onAgentChange={handleAgentChange}
        onResizeLayout={handleResizeLayout}
        onShowSetupInstructions={() => setIsSetupHelpOpen(true)}
      />

      {/* 3. Terminal Zellij / Tmux footer rail shortcuts bar */}
      <footer className="h-8 bg-[#151516] border-t border-[#2d2d2d] flex items-center justify-between px-5 py-1 text-[11px] font-mono text-[#77777a] select-none shrink-0 z-40">
        <div className="flex items-center space-x-4 overflow-x-auto whitespace-nowrap scrollbar-none py-1">
          <div className="flex items-center space-x-1 text-gray-400">
            <span className="bg-[#1c1c1e] border border-[#2d2d2d] text-[10px] uppercase font-bold px-1.5 py-0.5 rounded text-gray-300 select-none">
              Click Pane
            </span>
            <span>Focus active</span>
          </div>

          <div className="h-3 w-px bg-[#2d2d2d] shrink-0" />

          <div className="flex items-center space-x-1 text-gray-400">
            <span className="bg-[#1c1c1e] border border-[#2d2d2d] text-[10px] uppercase font-bold px-1.5 py-0.5 rounded text-gray-300 select-none">
              Split Right
            </span>
            <span>Click header columns icon</span>
          </div>

          <div className="h-3 w-px bg-[#2d2d2d] shrink-0" />

          <div className="flex items-center space-x-1 text-gray-400">
            <span className="bg-[#1c1c1e] border border-[#2d2d2d] text-[10px] uppercase font-bold px-1.5 py-0.5 rounded text-gray-300 select-none">
              Split Down
            </span>
            <span>Click header rows icon</span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-gray-500 shrink-0 select-text">
          <span>Target Host:</span>
          <span className="text-gray-300 font-bold">127.0.0.1</span>
        </div>
      </footer>

      {/* 4. Help Modals, Slide Drawers and Overlays portals */}
      <AgentsDrawer
        isOpen={isAgentsDrawerOpen}
        onClose={() => setIsAgentsDrawerOpen(false)}
        agents={agents}
        onSaveAgent={handleSaveAgent}
        onDeleteAgent={handleDeleteAgent}
        onResetAgents={handleResetAgents}
      />

      <InstructionDialog
        isOpen={isSetupHelpOpen}
        onClose={() => setIsSetupHelpOpen(false)}
        token={bridgeToken}
      />
    </div>
  );
}
