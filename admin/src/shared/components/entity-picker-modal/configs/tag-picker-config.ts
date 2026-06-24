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
  buildTagsQueryVariables,
  tagSortFieldMapping,
  type TagsOrderField,
  type TagsWhereInput,
} from "@/domains/inventory/tags/page/page-config";
import { filterSchema } from "@/domains/inventory/tags/page/filter-schema";
import type { ApiTag } from "@/graphql/types";

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
  search: string;
  pageSize: number;
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  excludeIds: string[];
}): IEntityPickerDataResult<ITagPickerEntity> {
  const { search, pageSize, excludeIds } = options;
  const tagQueryVariables = useMemo(
    () =>
      buildTagsQueryVariables({
        first: options.first,
        after: options.after ?? null,
        last: options.last,
        before: options.before ?? null,
      }),
    [options.first, options.after, options.last, options.before],
  );
  const { tags, totalCount, pageInfo, loading, error } =
    useTags(tagQueryVariables);
  const excludedIdSet = useMemo(() => new Set(excludeIds), [excludeIds]);
  const visibleTags = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return tags;
    }

    return tags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(searchValue) ||
        tag.handle.toLowerCase().includes(searchValue),
    );
  }, [search, tags]);
  const data = useMemo(
    () =>
      visibleTags
        .filter((tag) => !excludedIdSet.has(tag.id))
        .map(transformTag),
    [excludedIdSet, visibleTags],
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
    headerName: "Products",
    field: "productsCount",
    minWidth: 120,
    sortable: false,
  },
];

export const tagPickerConfig: IEntityPickerConfig<
  ITagPickerEntity,
  TagsWhereInput,
  TagsOrderField
> = {
  entityType: "tag",
  entityName: "Tag",
  entityNamePlural: "Tags",
  filterSchema,
  columns: tagPickerColumns,
  pageConfig: {
    storageKey: "tag-picker-grid-state",
    sortFieldMapping: tagSortFieldMapping,
    defaultPageSize: 20,
  },
  useData: useTagsPickerData,
  getRowId: (entity) => entity.id,
};

registerEntityPickerConfig(tagPickerConfig);
