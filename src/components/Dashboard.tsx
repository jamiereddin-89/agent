import React from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { LayoutNode, Agent, BridgeConfig } from "../types";
import PaneContainer from "./PaneContainer";

interface DashboardProps {
  layout: LayoutNode;
  agents: Agent[];
  bridgeConfig: BridgeConfig;
  activePaneId: string | null;
  setActivePaneId: (id: string | null) => void;
  onSplit: (paneId: string, direction: "horizontal" | "vertical", agentId: string) => void;
  onClose: (paneId: string) => void;
  onAgentChange: (paneId: string, agentId: string) => void;
  onResizeLayout: (nodeId: string, sizes: number[]) => void;
  onShowSetupInstructions: () => void;
}

export default function Dashboard({
  layout,
  agents,
  bridgeConfig,
  activePaneId,
  setActivePaneId,
  onSplit,
  onClose,
  onAgentChange,
  onResizeLayout,
  onShowSetupInstructions,
}: DashboardProps) {
  
  // Recursively render layout nodes
  const renderLayoutNode = (node: LayoutNode): React.ReactNode => {
    if (node.type === "leaf") {
      return (
        <PaneContainer
          paneId={node.id}
          agentId={node.agentId}
          agents={agents}
          bridgeConfig={bridgeConfig}
          isActive={activePaneId === node.id}
          onFocus={() => setActivePaneId(node.id)}
          onSplit={onSplit}
          onClose={onClose}
          onAgentChange={onAgentChange}
          onShowSetupInstructions={onShowSetupInstructions}
        />
      );
    }

    // Branch node - render a PanelGroup with handles
    return (
      <PanelGroup
        direction={node.direction}
        onLayout={(sizes) => onResizeLayout(node.id, sizes)}
        className="w-full h-full"
      >
        {node.children.map((child, idx) => {
          const isLast = idx === node.children.length - 1;
          return (
            <React.Fragment key={child.id}>
              <Panel defaultSize={node.sizes[idx] || (100 / node.children.length)}>
                {renderLayoutNode(child)}
              </Panel>
                            {!isLast && (
                <PanelResizeHandle
                  className={`hover:bg-orange-500/30 hover:transition-all hover:duration-200 focus:outline-hidden relative flex items-center justify-center ${
                    node.direction === "horizontal"
                      ? "w-2 h-full cursor-col-resize bg-[#0c0c0d]"
                      : "h-2 w-full cursor-row-resize bg-[#0c0c0d]"
                  }`}
                >
                  {/* Subtle inner line decoration with spacer */}
                  <div
                    className={`bg-[#2d2d2d] rounded-full hover:bg-orange-400 pointer-events-none transition-colors ${
                      node.direction === "horizontal"
                        ? "w-0.5 h-6 hover:w-1"
                        : "h-0.5 w-6 hover:h-1"
                    }`}
                  />
                </PanelResizeHandle>
              )}
            </React.Fragment>
          );
        })}
      </PanelGroup>
    );
  };

  return (
    <div className="w-full h-full flex-1 min-h-0 select-none bg-[#0c0c0d] p-1.5 overflow-hidden">
      {renderLayoutNode(layout)}
    </div>
  );
}
