"use client";

import { createElement, useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import { TagOutlined } from "@ant-design/icons";
import { EntityCellRenderer } from "../cell-renderers";
import { registerEntityPickerConfig } from ".";
import type {
  IEntityPickerConfig,
  IEntityPickerDataResult,
  IPickableEntity,
} from "../types";
import { useTags } from "@/domains/inventory/tags/hooks";
import {
  buildTagSearchCondition,
  tagFilterTransformers,
  tagSortFieldMapping,
} from "@/domains/inventory/tags/page/page-config";
import { filterSchema } from "@/domains/inventory/tags/page/filter-schema";
import type {
  ApiTag,
  ApiTagOrderByInput,
  ApiTagWhereInput,
} from "@/graphql/types";
import { TagOrderField } from "@/graphql/types";

interface ITagPickerEntity extends IPickableEntity {
  handle: string;
  productsCount: number;
}

function transformTag(tag: ApiTag): ITagPickerEntity {
  return {
    id: tag.id,
    title: tag.name,
    image: null,
    handle: tag.handle,
    productsCount: tag.productsCount,
  };
}

function useTagsPickerData(options: {
  pageSize: number;
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: object | null;
  orderBy?: object[] | null;
  excludeIds: string[];
}): IEntityPickerDataResult<ITagPickerEntity> {
  const {
    pageSize,
    first,
    after,
    last,
    before,
    where: inputWhere,
    orderBy,
    excludeIds,
  } = options;
  const where = useMemo<ApiTagWhereInput | null>(
    () => {
      const conditions: ApiTagWhereInput[] = [];

      if (inputWhere) {
        conditions.push(inputWhere as ApiTagWhereInput);
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
  const { tags, totalCount, pageInfo, loading, error } = useTags({
    first,
    after,
    last,
    before,
    where,
    orderBy: orderBy as ApiTagOrderByInput[] | null,
  });
  const data = useMemo(
    () => tags.map(transformTag),
    [tags],
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
    headerName: "Handle",
    field: "handle",
    minWidth: 160,
  },
  {
    headerName: "Products",
    field: "productsCount",
    minWidth: 120,
  },
];

export const tagPickerConfig: IEntityPickerConfig<
  ITagPickerEntity,
  ApiTagWhereInput,
  TagOrderField
> = {
  entityType: "tag",
  entityName: "Tag",
  entityNamePlural: "Tags",
  filterSchema,
  columns: tagPickerColumns,
  pageConfig: {
    storageKey: "tag-picker-grid-state",
    sortFieldMapping: tagSortFieldMapping,
    buildSearchCondition: buildTagSearchCondition,
    filterTransformers: tagFilterTransformers,
    defaultPageSize: 20,
  },
  useData: useTagsPickerData,
  getRowId: (entity) => entity.id,
};

registerEntityPickerConfig(tagPickerConfig);
