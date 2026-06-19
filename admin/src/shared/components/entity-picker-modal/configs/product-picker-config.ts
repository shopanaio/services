"use client";

import { useState, useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import { filterSchema } from "@/domains/inventory/products/page/filter-schema";
import { mockProductsList } from "@/mocks/products";
import { getProductThumbnailFile } from "@/domains/inventory/products/utils/api-product-display";
import { getProductStatus } from "@/domains/inventory/products/utils/product-status";
import { EntityCellRenderer, StatusCellRenderer } from "../cell-renderers";
import { registerEntityPickerConfig } from ".";
import type {
  IEntityPickerConfig,
  IEntityPickerDataResult,
  IPickableEntity,
} from "../types";
import type { IFilterValue } from "@/layouts/filters";
import type { ApiProduct } from "@/graphql/types";

/**
 * Product entity adapted for picker
 */
type ProductPickerEntity = IPickableEntity;

/**
 * Transform product list item to picker entity
 */
function transformProduct(product: ApiProduct): ProductPickerEntity {
  const thumbnail = getProductThumbnailFile(product);

  return {
    id: product.id,
    title: product.title,
    image: thumbnail?.url ?? null,
    status: getProductStatus(product),
  };
}

/**
 * Mock data hook for products picker
 * In real implementation, this would fetch from API
 */
function useProductsPickerData(options: {
  filters: IFilterValue[];
  search: string;
  pageSize: number;
}): IEntityPickerDataResult<ProductPickerEntity> {
  const { search, pageSize } = options;
  const [page, setPage] = useState(0);

  // Transform and filter data
  const allData = useMemo(() => {
    let result = mockProductsList.map(transformProduct);

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((p) =>
        p.title.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [search]);

  // Paginate
  const paginatedData = useMemo(() => {
    const start = page * pageSize;
    return allData.slice(start, start + pageSize);
  }, [allData, page, pageSize]);

  const total = allData.length;
  const rangeStart = page * pageSize + 1;
  const rangeEnd = Math.min((page + 1) * pageSize, total);
  const hasNext = rangeEnd < total;
  const hasPrev = page > 0;

  return {
    data: paginatedData,
    isLoading: false,
    error: null,
    pagination: {
      total,
      pageSize,
      hasNext,
      hasPrev,
      rangeStart: total > 0 ? rangeStart : 0,
      rangeEnd,
    },
    onNext: () => setPage((p) => p + 1),
    onPrev: () => setPage((p) => Math.max(0, p - 1)),
    onPageSizeChange: () => setPage(0),
  };
}

/**
 * Column definitions for products picker
 */
const productPickerColumns: ColDef<ProductPickerEntity>[] = [
  {
    headerName: "Product",
    field: "title",
    cellRenderer: EntityCellRenderer,
    flex: 1,
    minWidth: 250,
  },
  {
    headerName: "Status",
    field: "status",
    cellRenderer: StatusCellRenderer,
    minWidth: 120,
  },
];

/**
 * Product picker configuration
 */
export const productPickerConfig: IEntityPickerConfig<ProductPickerEntity> = {
  entityType: "product",
  entityName: "Product",
  entityNamePlural: "Products",
  filterSchema: filterSchema,
  columns: productPickerColumns,
  useData: useProductsPickerData,
  getRowId: (entity) => entity.id,
};

// Register the configuration
registerEntityPickerConfig(productPickerConfig);
