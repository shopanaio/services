"use client";

import {
  createElement,
  useState,
  useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import { TagOutlined } from "@ant-design/icons";
import { EntityCellRenderer,
  StatusCellRenderer } from "../cell-renderers";
import { registerEntityPickerConfig } from ".";
import type {
  IEntityPickerConfig,
  IEntityPickerDataResult,
  IPickableEntity,
  } from "../types";
import {
  FilterType,
  enumOperators,
} from "@/layouts/filters";
import type { IFilterValue, IFilterSchema } from "@/layouts/filters/core/types";
import { mockTagsList, type ITagListItem } from "../mocks/tags-list";

interface ITagPickerEntity extends IPickableEntity {
  slug: string;
  productsCount: number;
  color: string;
}

function transformTag(tag: ITagListItem): ITagPickerEntity {
  return {
    id: tag.id,
    title: tag.name,
    image: null,
    status: tag.status,
    slug: tag.slug,
    productsCount: tag.productsCount,
    color: tag.color,
  };
}

const tagFilterSchema: IFilterSchema[] = [
  {
    key: "status",
    label: "Status",
    description: "Filter by tag status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "status",
    options: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ],
  },
];

function useTagsPickerData(options: {
  filters: IFilterValue[];
  search: string;
  pageSize: number;
}): IEntityPickerDataResult<ITagPickerEntity> {
  const { search, filters, pageSize } = options;
  const [page, setPage] = useState(0);

  const allData = useMemo(() => {
    let result = mockTagsList.map(transformTag);

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(searchLower)
      );
    }

    const statusFilter = filters.find((f) => f.schemaKey === "status");
    if (statusFilter?.value) {
      result = result.filter((t) => t.status === statusFilter.value);
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

const tagPickerColumns: ColDef<ITagPickerEntity>[] = [
  {
    headerName: "Tag",
    field: "title",
    cellRenderer: EntityCellRenderer,
    cellRendererParams: { fallbackIcon: createElement(TagOutlined) },
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

export const tagPickerConfig: IEntityPickerConfig<ITagPickerEntity> = {
  entityType: "tag",
  entityName: "Tag",
  entityNamePlural: "Tags",
  filterSchema: tagFilterSchema,
  columns: tagPickerColumns,
  useData: useTagsPickerData,
  getRowId: (entity) => entity.id,
};

registerEntityPickerConfig(tagPickerConfig);
