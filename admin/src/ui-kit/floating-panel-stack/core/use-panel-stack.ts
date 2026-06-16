"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type {
  PanelId,
  PanelStackItem,
  PanelStackConfig,
  PanelPosition,
  PanelAnimationState,
} from "./types";
import { DEFAULT_STACK_CONFIG } from "./types";

// ============================================================================
// Types
// ============================================================================

interface UsePanelStackOptions extends PanelStackConfig {}

interface UsePanelStackReturn<T = unknown> {
  /** All panels including those being animated out */
  panels: PanelStackItem<T>[];
  /** Only active panels (not exiting) */
  activePanels: PanelStackItem<T>[];
  /** Panels sorted by activation order (most recent first) */
  sortedPanels: PanelStackItem<T>[];
  /** Add or update a panel */
  setPanel: (id: PanelId, type: string, data: T) => void;
  /** Remove a panel (triggers exit animation) */
  removePanel: (id: PanelId) => void;
  /** Clear all panels */
  clearAll: () => void;
  /** Calculate position for a panel at given index */
  getPosition: (index: number, total: number) => PanelPosition;
  /** Check if a panel exists */
  hasPanel: (id: PanelId) => boolean;
  /** Get panel by id */
  getPanel: (id: PanelId) => PanelStackItem<T> | undefined;
  /** Configuration */
  config: Required<PanelStackConfig>;
}

// ============================================================================
// Hook
// ============================================================================

export function usePanelStack<T = unknown>(
  options: UsePanelStackOptions = {}
): UsePanelStackReturn<T> {
  const config = useMemo(
    () => ({
      ...DEFAULT_STACK_CONFIG,
      ...options,
    }),
    [options.maxVisible, options.animationDuration, options.scaleFactor, options.translateY]
  );

  const [panels, setPanels] = useState<PanelStackItem<T>[]>([]);
  const exitTimeoutsRef = useRef<Map<PanelId, NodeJS.Timeout>>(new Map());

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      exitTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      exitTimeoutsRef.current.clear();
    };
  }, []);

  // Set or update a panel
  const setPanel = useCallback(
    (id: PanelId, type: string, data: T) => {
      setPanels((prev) => {
        const existingIndex = prev.findIndex((p) => p.id === id);

        if (existingIndex >= 0) {
          // Update existing panel data, reset animation if it was exiting
          const existing = prev[existingIndex];
          const updated: PanelStackItem<T> = {
            ...existing,
            type,
            data,
            animationState: existing.animationState === "exiting" ? "entering" : existing.animationState,
            activatedAt: Date.now(), // Refresh activation time
          };

          // Cancel any pending exit timeout
          const timeout = exitTimeoutsRef.current.get(id);
          if (timeout) {
            clearTimeout(timeout);
            exitTimeoutsRef.current.delete(id);
          }

          const next = [...prev];
          next[existingIndex] = updated;
          return next;
        }

        // Add new panel
        const newPanel: PanelStackItem<T> = {
          id,
          type,
          data,
          animationState: "entering",
          activatedAt: Date.now(),
        };

        return [...prev, newPanel];
      });

      // Transition from entering to visible after animation
      setTimeout(() => {
        setPanels((prev) =>
          prev.map((p) =>
            p.id === id && p.animationState === "entering"
              ? { ...p, animationState: "visible" as PanelAnimationState }
              : p
          )
        );
      }, config.animationDuration);
    },
    [config.animationDuration]
  );

  // Remove a panel with exit animation
  const removePanel = useCallback(
    (id: PanelId) => {
      // Start exit animation
      setPanels((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, animationState: "exiting" as PanelAnimationState } : p
        )
      );

      // Remove after animation completes
      const timeout = setTimeout(() => {
        setPanels((prev) => prev.filter((p) => p.id !== id));
        exitTimeoutsRef.current.delete(id);
      }, config.animationDuration);

      exitTimeoutsRef.current.set(id, timeout);
    },
    [config.animationDuration]
  );

  // Clear all panels
  const clearAll = useCallback(() => {
    // Start exit animation for all panels
    setPanels((prev) =>
      prev.map((p) => ({ ...p, animationState: "exiting" as PanelAnimationState }))
    );

    // Remove all after animation
    setTimeout(() => {
      setPanels([]);
      exitTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      exitTimeoutsRef.current.clear();
    }, config.animationDuration);
  }, [config.animationDuration]);

  // Calculate panel position
  const getPosition = useCallback(
    (index: number, total: number): PanelPosition => {
      const depth = index;
      const scale = 1 - config.scaleFactor * depth;
      const translateY = -config.translateY * depth;
      const zIndex = total - depth;
      const isVisible = depth < config.maxVisible;

      return {
        depth,
        total,
        scale,
        translateY,
        zIndex,
        isVisible,
      };
    },
    [config.scaleFactor, config.translateY, config.maxVisible]
  );

  // Check if panel exists
  const hasPanel = useCallback(
    (id: PanelId) => panels.some((p) => p.id === id && p.animationState !== "exiting"),
    [panels]
  );

  // Get panel by id
  const getPanel = useCallback(
    (id: PanelId) => panels.find((p) => p.id === id),
    [panels]
  );

  // Filter active panels (not exiting)
  const activePanels = useMemo(
    () => panels.filter((p) => p.animationState !== "exiting"),
    [panels]
  );

  // Sort panels by activation time (most recent first)
  const sortedPanels = useMemo(
    () => [...activePanels].sort((a, b) => b.activatedAt - a.activatedAt),
    [activePanels]
  );

  return {
    panels,
    activePanels,
    sortedPanels,
    setPanel,
    removePanel,
    clearAll,
    getPosition,
    hasPanel,
    getPanel,
    config,
  };
}
