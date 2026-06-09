export interface Agent {
  id: string;
  name: string;
  command: string;
  args: string[];
  cwd?: string;
  env: Record<string, string>;
  icon: string; // Lucide icon name, e.g., "Terminal", "Cpu", "Sparkles", "Code", "Bot"
  color: string; // accent hex, e.g., "#3b82f6"
  builtin?: boolean;
}

export type Direction = "horizontal" | "vertical";

export interface LayoutBranch {
  type: "branch";
  id: string;
  direction: Direction;
  sizes: number[];
  children: (LayoutBranch | LayoutLeaf)[];
}

export interface LayoutLeaf {
  type: "leaf";
  id: string;
  agentId: string;
}

export type LayoutNode = LayoutBranch | LayoutLeaf;

export interface BridgeConfig {
  url: string;
  token: string;
}
