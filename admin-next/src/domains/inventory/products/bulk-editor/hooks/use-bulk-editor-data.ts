import { useMemo } from "react";
import { useBulkEditorStore } from "./use-bulk-editor-store";
import { getProductsByIds } from "../mocks/bulk-editor-data";
import { transformProductsToRows, applyEditsToRows } from "../utils/transformers";
import { IBulkEditorRow } from "../types";

interface UseBulkEditorDataResult {
  rows: IBulkEditorRow[];
  displayRows: IBulkEditorRow[];
  isLoading: boolean;
  productsCount: number;
  variantsCount: number;
}

export function useBulkEditorData(): UseBulkEditorDataResult {
  const selectedProductIds = useBulkEditorStore((s) => s.selectedProductIds);
  const edits = useBulkEditorStore((s) => s.edits);

  // Fetch products by selected IDs
  const products = useMemo(() => {
    return getProductsByIds(selectedProductIds);
  }, [selectedProductIds]);

  // Transform to grid rows
  const rows = useMemo(() => {
    return transformProductsToRows(products);
  }, [products]);

  // Apply edits for display
  const displayRows = useMemo(() => {
    return applyEditsToRows(rows, edits);
  }, [rows, edits]);

  // Calculate counts
  const productsCount = products.length;
  const variantsCount = useMemo(() => {
    return products.reduce((sum, p) => sum + p.variants.length, 0);
  }, [products]);

  return {
    rows,
    displayRows,
    isLoading: false,
    productsCount,
    variantsCount,
  };
}
