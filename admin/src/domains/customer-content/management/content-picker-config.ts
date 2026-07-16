"use client";

import { createElement, useMemo } from "react";
import { LuFileText as FileTextOutlined } from "react-icons/lu";
import type { ColDef } from "ag-grid-community";
import type { ApiReviewContentOrderByInput, ApiReviewContentWhereInput } from "@/graphql/types";
import { ReviewContentOrderField } from "@/graphql/types";
import { EntityCellRenderer, StatusCellRenderer } from "@/shared/components/entity-picker-modal/cell-renderers";
import { registerEntityPickerConfig } from "@/shared/components/entity-picker-modal/configs";
import type { IEntityPickerConfig, IEntityPickerDataResult, IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import { useModerationContents } from "./hooks";

function useContentPickerData(options: { pageSize: number; first?: number; after?: string | null; last?: number; before?: string | null; where?: object | null; orderBy?: object[] | null; excludeIds: string[] }): IEntityPickerDataResult<IPickableEntity> {
  const where = useMemo<ApiReviewContentWhereInput | null>(() => {
    const conditions: ApiReviewContentWhereInput[] = [];
    if (options.where) conditions.push(options.where as ApiReviewContentWhereInput);
    if (options.excludeIds.length) conditions.push({ id: { _notIn: options.excludeIds } });
    return conditions.length > 1 ? { _and: conditions } : conditions[0] ?? null;
  }, [options.excludeIds, options.where]);
  const query = useModerationContents({ first: options.first, after: options.after, last: options.last, before: options.before, where, orderBy: options.orderBy as ApiReviewContentOrderByInput[] | null });
  const connection = query.data?.reviewsQuery.contents;
  return { data: connection?.edges.map(({ node }) => ({ id: node.id, title: node.title || `${node.__typename}: ${node.body.slice(0, 100)}`, status: node.status })) ?? [], isLoading: query.loading, error: query.error ?? null, pagination: { total: connection?.totalCount ?? 0, pageSize: options.pageSize, hasNext: connection?.pageInfo?.hasNextPage ?? false, hasPrev: connection?.pageInfo?.hasPreviousPage ?? false, startCursor: connection?.pageInfo?.startCursor, endCursor: connection?.pageInfo?.endCursor } };
}

const columns: ColDef<IPickableEntity>[] = [
  { headerName: "Content", field: "title", cellRenderer: EntityCellRenderer, cellRendererParams: { fallbackIcon: createElement(FileTextOutlined) }, flex: 1, minWidth: 380 },
  { headerName: "Status", field: "status", cellRenderer: StatusCellRenderer, width: 130, sortable: false },
];

export const contentPickerConfig: IEntityPickerConfig<IPickableEntity, ApiReviewContentWhereInput, ReviewContentOrderField> = {
  entityType: "review-content", entityName: "Content", entityNamePlural: "Content", filterSchema: [], searchEnabled: true, columns,
  pageConfig: { storageKey: "review-content-picker-grid-state", sortFieldMapping: { title: ReviewContentOrderField.Title }, buildSearchCondition: (search) => ({ _or: [{ title: { _containsi: search } }, { body: { _containsi: search } }, { authorDisplayName: { _containsi: search } }] }), defaultPageSize: 20, pageSizeOptions: [20, 50] },
  useData: useContentPickerData, getRowId: (entity) => entity.id,
};

registerEntityPickerConfig(contentPickerConfig);
