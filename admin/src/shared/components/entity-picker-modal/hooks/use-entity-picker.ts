"use client";

import { useCallback } from "react";
import { useModalStack } from "@/layouts/modals";
import type { IPickableEntity } from "../types";
import type { ApiFile } from "@/graphql/types";

interface IUseEntityPickerOptions<T extends IPickableEntity> {
  entityType: string;
  selectionMode?: "single" | "multi";
  initialSelection?: string[];
  excludeIds?: string[];
  maxSelection?: number;
  queryMeta?: unknown;
  onConfirm: (entities: T[], ids: string[]) => void;
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
    queryMeta,
    onConfirm,
  } = options;

  const openPicker = useCallback(() => {
    push("product-picker", {
      selectionMode,
      initialSelection,
      excludeIds,
      maxSelection,
      queryMeta,
      onConfirm,
    });
  }, [
    push,
    selectionMode,
    initialSelection,
    excludeIds,
    maxSelection,
    queryMeta,
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
    queryMeta,
    onConfirm,
  } = options;

  const openPicker = useCallback(() => {
    push("category-picker", {
      selectionMode,
      initialSelection,
      excludeIds,
      maxSelection,
      queryMeta,
      onConfirm,
    });
  }, [
    push,
    selectionMode,
    initialSelection,
    excludeIds,
    maxSelection,
    queryMeta,
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

interface IUseMediaPickerOptions {
  selectionMode?: "single" | "multi";
  initialSelection?: string[];
  excludeIds?: string[];
  maxSelection?: number;
  accept?: string;
  maxSize?: number;
  onConfirm: (files: ApiFile[]) => void;
}

/**
 * Hook to open media picker modal with file upload capability
 *
 * @example
 * ```tsx
 * const { openPicker } = useMediaPicker({
 *   onConfirm: (files) => {
 *     console.log("Selected files:", files);
 *   },
 * });
 *
 * return <Button onClick={openPicker}>Select Files</Button>;
 * ```
 */
export function useMediaPicker(options: IUseMediaPickerOptions) {
  const { push } = useModalStack();
  const {
    selectionMode = "multi",
    initialSelection = [],
    excludeIds = [],
    maxSelection,
    accept = "image/*",
    maxSize = 10,
    onConfirm,
  } = options;

  const openPicker = useCallback(() => {
    push("media-picker", {
      selectionMode,
      initialSelection,
      excludeIds,
      maxSelection,
      accept,
      maxSize,
      onConfirm,
    });
  }, [
    push,
    selectionMode,
    initialSelection,
    excludeIds,
    maxSelection,
    accept,
    maxSize,
    onConfirm,
  ]);

  return { openPicker };
}
