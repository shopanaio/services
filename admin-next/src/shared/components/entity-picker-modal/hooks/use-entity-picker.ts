"use client";

import { useCallback } from "react";
import { useModalStack } from "@/layouts/modals";
import type { IPickableEntity, IEntityPickerPayload } from "../types";

interface IUseEntityPickerOptions<T extends IPickableEntity> {
  entityType: string;
  selectionMode?: "single" | "multi";
  initialSelection?: string[];
  excludeIds?: string[];
  maxSelection?: number;
  onConfirm: (entities: T[]) => void;
}

/**
 * Hook to open entity picker modal
 *
 * @example
 * ```tsx
 * const { openPicker } = useEntityPicker({
 *   entityType: "product",
 *   onConfirm: (products) => {
 *     console.log("Selected products:", products);
 *   },
 * });
 *
 * return <Button onClick={openPicker}>Select Products</Button>;
 * ```
 */
export function useEntityPicker<T extends IPickableEntity>(
  options: IUseEntityPickerOptions<T>
) {
  const { push } = useModalStack();
  const {
    entityType,
    selectionMode = "multi",
    initialSelection = [],
    excludeIds = [],
    maxSelection,
    onConfirm,
  } = options;

  const openPicker = useCallback(() => {
    push("entity-picker", {
      entityType,
      selectionMode,
      initialSelection,
      excludeIds,
      maxSelection,
      onConfirm,
    });
  }, [
    push,
    entityType,
    selectionMode,
    initialSelection,
    excludeIds,
    maxSelection,
    onConfirm,
  ]);

  return { openPicker };
}

/**
 * Hook specifically for product picker
 * Uses dedicated product-picker modal for better reliability
 *
 * @example
 * ```tsx
 * const { openPicker } = useProductPicker({
 *   onConfirm: (products) => {
 *     setSelectedProducts(products);
 *   },
 * });
 * ```
 */
export function useProductPicker(
  options: Omit<IUseEntityPickerOptions<IPickableEntity>, "entityType">
) {
  const { push } = useModalStack();
  const {
    selectionMode = "multi",
    initialSelection = [],
    excludeIds = [],
    maxSelection,
    onConfirm,
  } = options;

  const openPicker = useCallback(() => {
    push("product-picker", {
      selectionMode,
      initialSelection,
      excludeIds,
      maxSelection,
      onConfirm,
    });
  }, [
    push,
    selectionMode,
    initialSelection,
    excludeIds,
    maxSelection,
    onConfirm,
  ]);

  return { openPicker };
}

export function useCategoryPicker(
  options: Omit<IUseEntityPickerOptions<IPickableEntity>, "entityType">
) {
  const { push } = useModalStack();
  const {
    selectionMode = "multi",
    initialSelection = [],
    excludeIds = [],
    maxSelection,
    onConfirm,
  } = options;

  const openPicker = useCallback(() => {
    push("category-picker", {
      selectionMode,
      initialSelection,
      excludeIds,
      maxSelection,
      onConfirm,
    });
  }, [
    push,
    selectionMode,
    initialSelection,
    excludeIds,
    maxSelection,
    onConfirm,
  ]);

  return { openPicker };
}

export function useTagPicker(
  options: Omit<IUseEntityPickerOptions<IPickableEntity>, "entityType">
) {
  const { push } = useModalStack();
  const {
    selectionMode = "multi",
    initialSelection = [],
    excludeIds = [],
    maxSelection,
    onConfirm,
  } = options;

  const openPicker = useCallback(() => {
    push("tag-picker", {
      selectionMode,
      initialSelection,
      excludeIds,
      maxSelection,
      onConfirm,
    });
  }, [
    push,
    selectionMode,
    initialSelection,
    excludeIds,
    maxSelection,
    onConfirm,
  ]);

  return { openPicker };
}
