"use client";

import { createElement, useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import { FolderOutlined } from "@ant-design/icons";
import { useCategories } from "@/domains/inventory/categories/hooks";
import { filterSchema } from "@/domains/inventory/categories/page/filter-schema";
import {
  buildCategorySearchCondition,
  categoryFilterTransformers,
  categorySortFieldMapping,
} from "@/domains/inventory/categories/page/page-config";
import { EntityCellRenderer, StatusCellRenderer } from "../cell-renderers";
import { registerEntityPickerConfig } from ".";
import type {
  IEntityPickerConfig,
  IEntityPickerDataResult,
  IPickableEntity,
} from "../types";
import type {
  ApiCategory,
  ApiCategoryCategoriesMetaInput,
  ApiCategoryOrderByInput,
  ApiCategoryWhereInput,
} from "@/graphql/types";
import { CategoryOrderField } from "@/graphql/types";

interface CategoryPickerEntity extends IPickableEntity {
  handle: string;
  productsCount: number;
}

function transformCategory(category: ApiCategory): CategoryPickerEntity {
  return {
    id: category.id,
    title: category.name,
    image: category.media[0]?.file.url ?? null,
    status: category.isPublished ? "active" : "inactive",
    handle: category.handle,
    productsCount: category.productsCount,
  };
}

function useCategoriesPickerData(options: {
  pageSize: number;
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: object | null;
  orderBy?: object[] | null;
  excludeIds: string[];
  queryMeta?: unknown;
}): IEntityPickerDataResult<CategoryPickerEntity> {
  const {
    pageSize,
    first,
    after,
    last,
    before,
    where: inputWhere,
    orderBy,
    excludeIds,
    queryMeta,
  } = options;
  const where = useMemo<ApiCategoryWhereInput | null>(
    () => {
      const conditions: ApiCategoryWhereInput[] = [];

      if (inputWhere) {
        conditions.push(inputWhere as ApiCategoryWhereInput);
      }

      if (excludeIds.length > 0) {
        conditions.push({ id: { _notIn: excludeIds } });
      }

      if (conditions.length === 0) return null;
      if (conditions.length === 1) return conditions[0];

      return { _and: conditions };
    },
    [excludeIds, inputWhere],
  );
  const { categories, totalCount, pageInfo, loading, error } = useCategories({
    first,
    after,
    last,
    before,
    where,
    orderBy: orderBy as ApiCategoryOrderByInput[] | null,
    meta: queryMeta as ApiCategoryCategoriesMetaInput | null | undefined,
    fetchPolicy: "network-only",
  });

  const data = useMemo(
    () => categories.map(transformCategory),
    [categories],
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
      startCursor: pageInfo?.startCursor ?? null,
      endCursor: pageInfo?.endCursor ?? null,
    },
  };
}

const categoryPickerColumns: ColDef<CategoryPickerEntity>[] = [
  {
    headerName: "Category",
    field: "title",
    cellRenderer: EntityCellRenderer,
    cellRendererParams: { fallbackIcon: createElement(FolderOutlined) },
    flex: 1,
    minWidth: 250,
  },
  {
    headerName: "Handle",
    field: "handle",
    minWidth: 160,
  },
  {
    headerName: "Status",
    field: "status",
    cellRenderer: StatusCellRenderer,
    minWidth: 120,
    sortable: false,
  },
  {
    headerName: "Products",
    field: "productsCount",
    minWidth: 120,
  },
];

export const categoryPickerConfig: IEntityPickerConfig<
  CategoryPickerEntity,
  ApiCategoryWhereInput,
  CategoryOrderField
> = {
  entityType: "category",
  entityName: "Category",
  entityNamePlural: "Categories",
  filterSchema,
  columns: categoryPickerColumns,
  pageConfig: {
    storageKey: "category-picker-grid-state",
    sortFieldMapping: categorySortFieldMapping,
    buildSearchCondition: buildCategorySearchCondition,
    filterTransformers: categoryFilterTransformers,
    defaultPageSize: 20,
  },
  useData: useCategoriesPickerData,
  getRowId: (entity) => entity.id,
};

registerEntityPickerConfig(categoryPickerConfig);
