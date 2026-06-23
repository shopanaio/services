"use client";

import { useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { useProducts } from "@/domains/inventory/products/hooks";
import {
  getProductBrandName,
  getProductPrimaryCategoryName,
  getProductThumbnailFile,
} from "@/domains/inventory/products/utils/api-product-display";
import { getProductStatus } from "@/domains/inventory/products/utils/product-status";
import { EntityCellRenderer, StatusCellRenderer } from "../cell-renderers";
import { registerEntityPickerConfig } from ".";
import type {
  IEntityPickerConfig,
  IEntityPickerDataResult,
  IPickableEntity,
} from "../types";
import type { IFilterValue } from "@/layouts/filters/core/types";
import type { ApiProduct } from "@/graphql/types";

type ProductPickerEntity = IPickableEntity;

function transformProduct(product: ApiProduct): ProductPickerEntity {
  const thumbnail = getProductThumbnailFile(product);

  return {
    id: product.id,
    title: product.title,
    image: thumbnail?.url ?? null,
    status: getProductStatus(product),
  };
}

function getFilterValues(filter: IFilterValue | undefined): string[] {
  if (!filter) {
    return [];
  }

  if (Array.isArray(filter.value)) {
    return filter.value.filter(
      (value): value is string => typeof value === "string",
    );
  }

  return typeof filter.value === "string" ? [filter.value] : [];
}

function filterCurrentProductPage(
  products: ApiProduct[],
  search: string,
  filters: IFilterValue[],
): ApiProduct[] {
  const searchValue = search.trim().toLowerCase();
  const statusValues = getFilterValues(
    filters.find((filter) => filter.schemaKey === "status"),
  );
  const categoryValues = getFilterValues(
    filters.find((filter) => filter.schemaKey === "category"),
  );
  const brandValues = getFilterValues(
    filters.find((filter) => filter.schemaKey === "brand"),
  );

  return products.filter((product) => {
    if (
      searchValue &&
      !product.title.toLowerCase().includes(searchValue) &&
      !(product.handle ?? "").toLowerCase().includes(searchValue)
    ) {
      return false;
    }

    if (
      statusValues.length > 0 &&
      !statusValues.includes(getProductStatus(product))
    ) {
      return false;
    }

    if (
      categoryValues.length > 0 &&
      !categoryValues.includes(getProductPrimaryCategoryName(product) ?? "")
    ) {
      return false;
    }

    if (
      brandValues.length > 0 &&
      !brandValues.includes(getProductBrandName(product) ?? "")
    ) {
      return false;
    }

    return true;
  });
}

function useProductsPickerData(options: {
  filters: IFilterValue[];
  search: string;
  pageSize: number;
}): IEntityPickerDataResult<ProductPickerEntity> {
  const { filters, search, pageSize } = options;
  const [pageIndex, setPageIndex] = useState(0);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([
    null,
  ]);
  const after = cursorHistory[pageIndex] ?? null;
  const { products, totalCount, pageInfo, loading, error } = useProducts({
    first: pageSize,
    after,
  });

  const data = useMemo(
    () =>
      filterCurrentProductPage(products, search, filters).map(transformProduct),
    [products, search, filters],
  );

  return {
    data,
    isLoading: loading,
    error,
    pagination: {
      total: totalCount,
      pageSize,
      hasNext: pageInfo?.hasNextPage ?? false,
      hasPrev: pageIndex > 0,
      rangeStart: products.length > 0 ? pageIndex * pageSize + 1 : 0,
      rangeEnd: Math.min(pageIndex * pageSize + products.length, totalCount),
    },
    onNext: () => {
      if (!pageInfo?.endCursor) {
        return;
      }

      setCursorHistory((current) => {
        const next = current.slice(0, pageIndex + 1);
        next[pageIndex + 1] = pageInfo.endCursor ?? null;
        return next;
      });
      setPageIndex((current) => current + 1);
    },
    onPrev: () => {
      setPageIndex((current) => Math.max(0, current - 1));
    },
    onPageSizeChange: () => {
      setPageIndex(0);
      setCursorHistory([null]);
    },
  };
}

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

export const productPickerConfig: IEntityPickerConfig<ProductPickerEntity> = {
  entityType: "product",
  entityName: "Product",
  entityNamePlural: "Products",
  filterSchema: [],
  columns: productPickerColumns,
  useData: useProductsPickerData,
  getRowId: (entity) => entity.id,
};

registerEntityPickerConfig(productPickerConfig);
