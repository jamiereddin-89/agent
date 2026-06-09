import React from "react";
import { Agent, BridgeConfig } from "../types";
import TerminalInstance from "./TerminalInstance";
import { Columns2, Rows2, X, ChevronDown, Monitor, LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";

interface PaneContainerProps {
  paneId: string;
  agentId: string;
  agents: Agent[];
  bridgeConfig: BridgeConfig;
  isActive: boolean;
  onFocus: () => void;
  onSplit: (paneId: string, direction: "horizontal" | "vertical", agentId: string) => void;
  onClose: (paneId: string) => void;
  onAgentChange: (paneId: string, agentId: string) => void;
  onShowSetupInstructions: () => void;
}

export default function PaneContainer({
  paneId,
  agentId,
  agents,
  bridgeConfig,
  isActive,
  onFocus,
  onSplit,
  onClose,
  onAgentChange,
  onShowSetupInstructions,
}: PaneContainerProps) {
  const activeAgent = agents.find((a) => a.id === agentId) || agents[0];

  // Dynamically resolve custom lucide icons if possible, otherwise fallback to Monitor icon
  const getAgentIcon = (iconName: string): LucideIcon => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Monitor;
  };

  const AgentIcon = getAgentIcon(activeAgent.icon);

  return (
    <div
      onClick={onFocus}
      className={`relative w-full h-full flex flex-col bg-black rounded overflow-hidden transition-all duration-200 border ${
        isActive
          ? "border-[#4a4a4a] shadow-[inset_0_0_10px_rgba(74,74,74,0.1)] ring-1"
          : "border-[#2d2d2d] hover:border-[#3d3d3d]"
      }`}
      style={{
        // Set custom ring color using agent color when active
        "--tw-ring-color": isActive ? activeAgent.color : "transparent",
      } as React.CSSProperties}
    >
      {/* Pane Executive Header */}
      <div 
        className={`flex items-center justify-between h-8 px-3 border-b select-none transition-colors ${
          isActive ? "bg-[#1c1c1e] border-[#3d3d3d]" : "bg-[#151516] border-[#2d2d2d]"
        }`}
      >
        <div className="flex items-center space-x-2 overflow-hidden mr-2">
          {/* Agent Color Dot / Icon wrapper */}
          <div
            className="flex items-center justify-center p-1 rounded-md"
            style={{ backgroundColor: `${activeAgent.color}15` }}
          >
            <AgentIcon className="w-3.5 h-3.5" style={{ color: activeAgent.color }} />
          </div>

          {/* Custom Selector for Swap Agent */}
          <div className="relative group flex items-center">
            <select
              value={activeAgent.id}
              onChange={(e) => onAgentChange(paneId, e.target.value)}
              className="text-xs font-mono font-medium text-gray-300 pr-5 pl-1 py-0.5 bg-transparent hover:bg-neutral-800 rounded cursor-pointer border-0 outline-hidden hover:text-white appearance-none transition-all"
            >
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id} className="bg-neutral-950 text-gray-300 font-mono">
                  {ag.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-gray-500 absolute right-1 pointer-events-none group-hover:text-gray-300 transition-colors" />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1">
          {/* Split Horizontal */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSplit(paneId, "horizontal", activeAgent.id);
            }}
            title="Split Right (Vertical line)"
            className="p-1 text-gray-500 hover:text-gray-300 hover:bg-neutral-900 rounded transition-colors"
          >
            <Columns2 className="w-3.5 h-3.5" />
          </button>

          {/* Split Vertical */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSplit(paneId, "vertical", activeAgent.id);
            }}
            title="Split Down (Horizontal line)"
            className="p-1 text-gray-500 hover:text-gray-300 hover:bg-neutral-900 rounded transition-colors"
          >
            <Rows2 className="w-3.5 h-3.5" />
          </button>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(paneId);
            }}
            title="Close Panel"
            className="p-1 text-gray-500 hover:text-red-400 hover:bg-neutral-900 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Area */}
      <div className="flex-1 min-h-0 relative">
        <TerminalInstance
          paneId={paneId}
          agent={activeAgent}
          bridgeConfig={bridgeConfig}
          isActive={isActive}
          onShowSetupInstructions={onShowSetupInstructions}
        />
      </div>
    </div>
  );
}
