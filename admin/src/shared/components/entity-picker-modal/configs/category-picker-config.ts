"use client";

import { createElement, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FolderOutlined } from "@ant-design/icons";
import { useCategories } from "@/domains/inventory/categories/hooks";
import type { ApiCategoryCategoriesMetaInput } from "@/domains/inventory/categories/graphql";
import { EntityCellRenderer, StatusCellRenderer } from "../cell-renderers";
import { registerEntityPickerConfig } from ".";
import type {
  IEntityPickerConfig,
  IEntityPickerDataResult,
  IPickableEntity,
} from "../types";
import type { IFilterValue } from "@/layouts/filters/core/types";
import type { ApiCategory, ApiCategoryWhereInput } from "@/graphql/types";

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
  filters: IFilterValue[];
  search: string;
  pageSize: number;
  excludeIds: string[];
  queryMeta?: unknown;
}): IEntityPickerDataResult<CategoryPickerEntity> {
  const { pageSize, excludeIds, queryMeta } = options;
  const [pageIndex, setPageIndex] = useState(0);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([
    null,
  ]);
  const after = cursorHistory[pageIndex] ?? null;
  const where = useMemo<ApiCategoryWhereInput | null>(
    () =>
      excludeIds.length > 0
        ? {
            id: {
              _notIn: excludeIds,
            },
          }
        : null,
    [excludeIds],
  );
  const { categories, totalCount, pageInfo, loading, error } = useCategories({
    first: pageSize,
    after,
    where,
    meta: queryMeta as ApiCategoryCategoriesMetaInput | null | undefined,
    fetchPolicy: "network-only",
  });

  const data = useMemo(
    () => categories.map(transformCategory),
    [categories],
  );

  const rangeStart = pageIndex * pageSize + 1;
  const rangeEnd = Math.min((pageIndex + 1) * pageSize, totalCount);
  const hasNext = pageInfo?.hasNextPage ?? false;

  return {
    data,
    isLoading: loading,
    error,
    pagination: {
      total: totalCount,
      pageSize,
      hasNext,
      hasPrev: pageIndex > 0,
      rangeStart: totalCount > 0 ? rangeStart : 0,
      rangeEnd,
    },
    onNext: () => {
      const nextCursor = pageInfo?.endCursor ?? null;
      if (!nextCursor) return;
      setCursorHistory((history) => {
        const next = [...history];
        next[pageIndex + 1] = nextCursor;
        return next;
      });
      setPageIndex((index) => index + 1);
    },
    onPrev: () => setPageIndex((index) => Math.max(0, index - 1)),
    onPageSizeChange: () => {
      setPageIndex(0);
      setCursorHistory([null]);
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
    headerName: "Status",
    field: "status",
    cellRenderer: StatusCellRenderer,
    minWidth: 120,
  },
];

export const categoryPickerConfig: IEntityPickerConfig<CategoryPickerEntity> =
  {
    entityType: "category",
    entityName: "Category",
    entityNamePlural: "Categories",
    filterSchema: [],
    searchEnabled: false,
    columns: categoryPickerColumns,
    useData: useCategoriesPickerData,
    getRowId: (entity) => entity.id,
  };

registerEntityPickerConfig(categoryPickerConfig);
