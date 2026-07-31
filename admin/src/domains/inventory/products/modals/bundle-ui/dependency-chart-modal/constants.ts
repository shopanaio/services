// ============================================================================
// Node Dimensions
// ============================================================================
// Single source of truth for node sizes used by both ELK layout and CSS styles

export const NODE_DIMENSIONS = {
  item: { width: 250, height: 80 },
  rule: { width: 275, height: 80 },
  bundle: { width: 150, height: 80 },
  hub: { width: 120, height: 24 },
} as const;

export type NodeType = keyof typeof NODE_DIMENSIONS;
