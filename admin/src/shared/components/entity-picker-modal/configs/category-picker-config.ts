"use client";

import { useState, useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import { EntityCellRenderer, StatusCellRenderer } from "../cell-renderers";
import { registerEntityPickerConfig } from ".";
import type {
  IEntityPickerConfig,
  IEntityPickerDataResult,
  IPickableEntity,
} from "../types";
import {
  FilterType,
  enumOperators,
  type IFilterValue,
  type IFilterSchema,
} from "@/layouts/filters";
import {
  mockCategoriesList,
  type ICategoryListItem,
} from "../mocks/categories-list";

interface ICategoryPickerEntity extends IPickableEntity {
  slug: string;
  productsCount: number;
}

function transformCategory(category: ICategoryListItem): ICategoryPickerEntity {
  return {
    id: category.id,
    title: category.name,
    image: category.image,
    status: category.status,
    slug: category.slug,
    productsCount: category.productsCount,
  };
}

const categoryFilterSchema: IFilterSchema[] = [
  {
    key: "status",
    label: "Status",
    description: "Filter by category status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "status",
    options: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ],
  },
];

function useCategoriesPickerData(options: {
  filters: IFilterValue[];
  search: string;
  pageSize: number;
}): IEntityPickerDataResult<ICategoryPickerEntity> {
  const { search, filters, pageSize } = options;
  const [page, setPage] = useState(0);

  const allData = useMemo(() => {
    let result = mockCategoriesList.map(transformCategory);

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((c) =>
        c.title.toLowerCase().includes(searchLower)
      );
    }

    const statusFilter = filters.find((f) => f.schemaKey === "status");
    if (statusFilter?.value) {
      result = result.filter((c) => c.status === statusFilter.value);
    }

    return result;
  }, [search, filters]);

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

const categoryPickerColumns: ColDef<ICategoryPickerEntity>[] = [
  {
    headerName: "Category",
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

export const categoryPickerConfig: IEntityPickerConfig<ICategoryPickerEntity> =
  {
    entityType: "category",
    entityName: "Category",
    entityNamePlural: "Categories",
    filterSchema: categoryFilterSchema,
    columns: categoryPickerColumns,
    useData: useCategoriesPickerData,
    getRowId: (entity) => entity.id,
  };

registerEntityPickerConfig(categoryPickerConfig);
