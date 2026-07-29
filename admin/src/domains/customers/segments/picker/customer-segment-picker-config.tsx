"use client";

import { createElement, useMemo } from "react";
import { LuUsers } from "react-icons/lu";
import type { ColDef } from "ag-grid-community";
import {
  EntityCellRenderer,
} from "@/shared/components/entity-picker-modal/cell-renderers";
import {
  registerEntityPickerConfig,
} from "@/shared/components/entity-picker-modal/configs";
import type {
  IEntityPickerConfig,
  IEntityPickerDataResult,
  IPickableEntity,
} from "@/shared/components/entity-picker-modal/types";
import type {
  ApiCustomerSegment,
  ApiCustomerSegmentOrderByInput,
  ApiCustomerSegmentWhereInput,
} from "@/graphql/types";
import { CustomerSegmentOrderField } from "@/graphql/types";
import { useCustomerSegments } from "../hooks";
import { filterSchema } from "../page/filter-schema";
import {
  buildCustomerSegmentSearchCondition,
  customerSegmentFilterTransformers,
  customerSegmentSortFieldMapping,
} from "../page/page-config";

export interface CustomerSegmentPickerEntity extends IPickableEntity {
  customersCount: number;
  description: string;
}

function transformSegment(
  segment: ApiCustomerSegment,
): CustomerSegmentPickerEntity {
  return {
    id: segment.id,
    title: segment.name,
    description: segment.description ?? "",
    customersCount: segment.customersCount,
    status: segment.status,
  };
}

function useCustomerSegmentsPickerData(options: {
  pageSize: number;
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: object | null;
  orderBy?: object[] | null;
  excludeIds: string[];
}): IEntityPickerDataResult<CustomerSegmentPickerEntity> {
  const {
    pageSize,
    first,
    after,
    last,
    before,
    where,
    orderBy,
    excludeIds,
  } = options;
  const segmentWhere = useMemo<ApiCustomerSegmentWhereInput | null>(() => {
    const conditions: ApiCustomerSegmentWhereInput[] = [];
    if (where) conditions.push(where as ApiCustomerSegmentWhereInput);
    if (excludeIds.length > 0) {
      conditions.push({ id: { _notIn: excludeIds } });
    }
    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0]!;
    return { _and: conditions };
  }, [excludeIds, where]);
  const { segments, totalCount, pageInfo, loading, error } =
    useCustomerSegments({
      first,
      after,
      last,
      before,
      where: segmentWhere,
      orderBy: orderBy as ApiCustomerSegmentOrderByInput[] | null,
    });
  const data = useMemo(
    () => segments.map(transformSegment),
    [segments],
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

const columns: ColDef<CustomerSegmentPickerEntity>[] = [
  {
    headerName: "Segment",
    field: "title",
    cellRenderer: EntityCellRenderer,
    cellRendererParams: { fallbackIcon: createElement(LuUsers) },
    flex: 1,
    minWidth: 260,
  },
  {
    headerName: "Description",
    field: "description",
    flex: 1,
    minWidth: 240,
  },
  {
    headerName: "Members",
    field: "customersCount",
    width: 120,
  },
];

export const customerSegmentPickerConfig: IEntityPickerConfig<
  CustomerSegmentPickerEntity,
  ApiCustomerSegmentWhereInput,
  CustomerSegmentOrderField
> = {
  entityType: "customer-segment",
  entityName: "Segment",
  entityNamePlural: "Segments",
  filterSchema,
  columns,
  pageConfig: {
    storageKey: "customer-segment-picker-grid-state",
    sortFieldMapping: customerSegmentSortFieldMapping,
    buildSearchCondition: buildCustomerSegmentSearchCondition,
    filterTransformers: customerSegmentFilterTransformers,
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50],
  },
  useData: useCustomerSegmentsPickerData,
  getRowId: (segment) => segment.id,
};

registerEntityPickerConfig(customerSegmentPickerConfig);
