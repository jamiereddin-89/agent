import { LayoutNode, LayoutBranch, LayoutLeaf, Direction } from "../types";

// Helper to generate a unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Find and split a leaf node in the layout tree
export function splitLeafInTree(
  node: LayoutNode,
  targetLeafId: string,
  direction: Direction,
  newLeafId: string,
  newAgentId: string
): LayoutNode {
  if (node.type === "leaf") {
    if (node.id === targetLeafId) {
      // Create a branch containing the original leaf and the new leaf
      const siblingLeaf: LayoutLeaf = {
        type: "leaf",
        id: newLeafId,
        agentId: newAgentId,
      };

      const newBranch: LayoutBranch = {
        type: "branch",
        id: `branch-${generateId()}`,
        direction,
        sizes: [50, 50],
        children: [node, siblingLeaf],
      };

      return newBranch;
    }
    return node;
  }

  // If branch, recursively search children
  const updatedChildren = node.children.map((child) =>
    splitLeafInTree(child, targetLeafId, direction, newLeafId, newAgentId)
  );

  // Check if any child was modified
  const hasChanged = updatedChildren.some((child, idx) => child !== node.children[idx]);

  if (hasChanged) {
    return {
      ...node,
      children: updatedChildren,
    };
  }

  return node;
}

// Find and close a leaf node in the layout tree
export function closeLeafInTree(node: LayoutNode, targetLeafId: string): LayoutNode | null {
  if (node.type === "leaf") {
    if (node.id === targetLeafId) {
      // Tell parent to remove this leaf
      return null;
    }
    return node;
  }

  // Iterate over children to filter out the closed leaf
  const newChildren: LayoutNode[] = [];
  const keptIndices: number[] = [];

  node.children.forEach((child, idx) => {
    const updated = closeLeafInTree(child, targetLeafId);
    if (updated !== null) {
      newChildren.push(updated);
      keptIndices.push(idx);
    }
  });

  // If no children left, remove the branch itself
  if (newChildren.length === 0) {
    return null;
  }

  // If only one child remains, elevate it to replace the branch
  if (newChildren.length === 1) {
    return newChildren[0];
  }

  // Adjust sizes for remaining children
  let newSizes: number[] = [];
  if (keptIndices.length === node.sizes.length) {
    newSizes = [...node.sizes];
  } else {
    const sumOfKept = keptIndices.reduce((sum, idx) => sum + (node.sizes[idx] || 0), 0);
    if (sumOfKept > 0) {
      newSizes = keptIndices.map((idx) => Math.round(((node.sizes[idx] || 0) / sumOfKept) * 100));
    } else {
      // Fallback to equal sizes
      newSizes = newChildren.map(() => Math.round(100 / newChildren.length));
    }
  }

  return {
    ...node,
    sizes: newSizes,
    children: newChildren,
  };
}

// Update agent ID on a leaf node
export function updateAgentInTree(node: LayoutNode, targetLeafId: string, newAgentId: string): LayoutNode {
  if (node.type === "leaf") {
    if (node.id === targetLeafId) {
      return {
        ...node,
        agentId: newAgentId,
      };
    }
    return node;
  }

  return {
    ...node,
    children: node.children.map((child) => updateAgentInTree(child, targetLeafId, newAgentId)),
  };
}

// Update pane sizes for a branch node
export function updateSizesInTree(node: LayoutNode, targetBranchId: string, sizes: number[]): LayoutNode {
  if (node.type === "leaf") {
    return node;
  }

  if (node.id === targetBranchId) {
    return {
      ...node,
      sizes,
    };
  }

  return {
    ...node,
    children: node.children.map((child) => updateSizesInTree(child, targetBranchId, sizes)),
  };
}

// List all leaf node IDs in the tree (for active pane tracking or cleanup)
export function getAllLeafIds(node: LayoutNode): string[] {
  if (node.type === "leaf") {
    return [node.id];
  }
  return node.children.flatMap((child) => getAllLeafIds(child));
}
