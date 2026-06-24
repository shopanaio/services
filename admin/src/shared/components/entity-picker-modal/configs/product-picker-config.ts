"use client";

import { useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import { useProducts } from "@/domains/inventory/products/hooks";
import { filterSchema } from "@/domains/inventory/products/page/filter-schema";
import {
  buildProductSearchCondition,
  productFilterTransformers,
  productSortFieldMapping,
} from "@/domains/inventory/products/page/page-config";
import {
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
import type {
  ApiProduct,
  ApiProductOrderByInput,
  ApiProductWhereInput,
  ProductOrderField,
} from "@/graphql/types";

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

function useProductsPickerData(options: {
  pageSize: number;
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: object | null;
  orderBy?: object[] | null;
  excludeIds: string[];
  goToNextPage?: (endCursor: string) => void;
  goToPrevPage?: (startCursor: string) => void;
  getRangeStart?: (itemCount: number) => number;
  getRangeEnd?: (itemCount: number) => number;
}): IEntityPickerDataResult<ProductPickerEntity> {
  const {
    pageSize,
    first,
    after,
    last,
    before,
    where,
    orderBy,
    excludeIds,
    goToNextPage,
    goToPrevPage,
    getRangeStart,
    getRangeEnd,
  } = options;
  const productsWhere = useMemo<ApiProductWhereInput | null>(() => {
    const conditions: ApiProductWhereInput[] = [];

    if (where) {
      conditions.push(where as ApiProductWhereInput);
    }

    if (excludeIds.length > 0) {
      conditions.push({ id: { _notIn: excludeIds } });
    }

    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0];

    return { _and: conditions };
  }, [excludeIds, where]);
  const { products, totalCount, pageInfo, loading, error } = useProducts({
    first,
    after,
    last,
    before,
    where: productsWhere,
    orderBy: orderBy as ApiProductOrderByInput[] | null,
  });

  const data = useMemo(
    () => products.map(transformProduct),
    [products],
  );

  return {
    data,
    isLoading: loading,
    error,
    pagination: {
      total: totalCount,
      pageSize,
      hasNext: pageInfo?.hasNextPage ?? false,
      hasPrev: pageInfo?.hasPreviousPage ?? false,
      rangeStart: getRangeStart?.(products.length) ?? 0,
      rangeEnd: Math.min(getRangeEnd?.(products.length) ?? 0, totalCount),
    },
    onNext: () => {
      if (pageInfo?.endCursor) goToNextPage?.(pageInfo.endCursor);
    },
    onPrev: () => {
      if (pageInfo?.startCursor) goToPrevPage?.(pageInfo.startCursor);
    },
    onPageSizeChange: () => {},
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
    sortable: false,
  },
];

export const productPickerConfig: IEntityPickerConfig<
  ProductPickerEntity,
  ApiProductWhereInput,
  ProductOrderField
> = {
  entityType: "product",
  entityName: "Product",
  entityNamePlural: "Products",
  filterSchema,
  columns: productPickerColumns,
  pageConfig: {
    storageKey: "product-picker-grid-state",
    sortFieldMapping: productSortFieldMapping,
    buildSearchCondition: buildProductSearchCondition,
    filterTransformers: productFilterTransformers,
    defaultPageSize: 20,
  },
  useData: useProductsPickerData,
  getRowId: (entity) => entity.id,
};

registerEntityPickerConfig(productPickerConfig);
