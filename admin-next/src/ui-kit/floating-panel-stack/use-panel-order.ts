"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { PanelType, PanelConfig } from "./floating-panel-stack";

/**
 * Hook to track panel activation order.
 * Panels are ordered by most recent interaction - last activated panel appears on top.
 */
export function usePanelOrder() {
  // Track the order of panel types (last item = most recent = top)
  const [order, setOrder] = useState<PanelType[]>([]);

  // Track previous active states to detect new activations
  const prevActiveRef = useRef<Set<PanelType>>(new Set());

  /**
   * Call this when a panel becomes active.
   * Moves the panel type to the end of the order (top of stack).
   */
  const activatePanel = useCallback((type: PanelType) => {
    setOrder((prev) => {
      // Remove if exists, then add to end
      const filtered = prev.filter((t) => t !== type);
      return [...filtered, type];
    });
  }, []);

  /**
   * Call this when a panel is deactivated.
   * Removes the panel type from the order.
   */
  const deactivatePanel = useCallback((type: PanelType) => {
    setOrder((prev) => prev.filter((t) => t !== type));
  }, []);

  /**
   * Sort panels by activation order.
   * Most recently activated panel will be first (rendered on top).
   */
  const sortPanels = useCallback(
    (panels: PanelConfig[]): PanelConfig[] => {
      return [...panels].sort((a, b) => {
        const aIndex = order.indexOf(a.type);
        const bIndex = order.indexOf(b.type);
        // Higher index = more recent = should come first (top)
        return bIndex - aIndex;
      });
    },
    [order]
  );

  /**
   * Auto-track panel activations based on active panel types.
   * Call this with the current set of active panel types.
   */
  const trackActivePanels = useCallback(
    (activePanels: { hasEditing: boolean; hasSelection: boolean }) => {
      const currentActive = new Set<PanelType>();
      if (activePanels.hasEditing) currentActive.add("editing");
      if (activePanels.hasSelection) currentActive.add("selection");

      // Detect newly activated panels
      currentActive.forEach((type) => {
        if (!prevActiveRef.current.has(type)) {
          activatePanel(type);
        }
      });

      // Detect deactivated panels
      prevActiveRef.current.forEach((type) => {
        if (!currentActive.has(type)) {
          deactivatePanel(type);
        }
      });

      prevActiveRef.current = currentActive;
    },
    [activatePanel, deactivatePanel]
  );

  return {
    order,
    activatePanel,
    deactivatePanel,
    sortPanels,
    trackActivePanels,
  };
}
