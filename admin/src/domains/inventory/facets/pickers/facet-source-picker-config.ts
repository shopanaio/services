"use client";

import { createElement, useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import { DatabaseOutlined } from "@ant-design/icons";
import { FilterOperator, FilterType } from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { EntityCellRenderer } from "@/shared/components/entity-picker-modal/cell-renderers";
import { registerEntityPickerConfig } from "@/shared/components/entity-picker-modal/configs";
import type {
  IEntityPickerConfig,
  IEntityPickerDataResult,
  IPickableEntity,
} from "@/shared/components/entity-picker-modal/types";
import {
  FacetSourceCandidateOrderField,
  FacetType,
  type ApiFacetSourceCandidateOrderByInput,
  type ApiFacetSourceCandidateWhereInput,
} from "@/graphql/types";
import { useFacetSourceCandidatesPageQuery } from "../hooks";
import type {
  FacetSourceCandidateFields,
} from "../graphql/operation-types";

export interface FacetSourcePickerEntity extends IPickableEntity {
  facetType: FacetType;
  handle: string;
  name: string;
  typeLabel: string;
}

interface FacetSourcePickerQueryMeta {
  allowedFacetTypes?: FacetType[];
}

const FACET_SOURCE_TYPE_LABELS: Record<FacetType, string> = {
  [FacetType.Price]: "Standard",
  [FacetType.InStock]: "Standard",
  [FacetType.Tag]: "Standard",
  [FacetType.Option]: "Product option",
  [FacetType.Feature]: "Product feature",
};

function buildFacetSourceSearchCondition(
  search: string,
): ApiFacetSourceCandidateWhereInput {
  return {
    _or: [
      { name: { _containsi: search } },
      { handle: { _containsi: search } },
    ],
  };
}

function getFacetSourceTypeFilter(
  queryMeta: unknown,
): ApiFacetSourceCandidateWhereInput | null {
  const allowedFacetTypes = (queryMeta as FacetSourcePickerQueryMeta | undefined)
    ?.allowedFacetTypes;

  if (!allowedFacetTypes?.length) {
    return null;
  }

  return { facetType: { _in: allowedFacetTypes } };
}

function transformFacetSourceCandidate(
  candidate: FacetSourceCandidateFields,
): FacetSourcePickerEntity {
  const name = candidate.name?.trim() || candidate.handle;

  return {
    id: candidate.id || `${candidate.facetType}:${candidate.handle}`,
    title: name,
    facetType: candidate.facetType,
    handle: candidate.handle,
    name,
    typeLabel: FACET_SOURCE_TYPE_LABELS[candidate.facetType],
  };
}

function useFacetSourcesPickerData(options: {
  pageSize: number;
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: object | null;
  orderBy?: object[] | null;
  excludeIds: string[];
  queryMeta?: unknown;
}): IEntityPickerDataResult<FacetSourcePickerEntity> {
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

  const where = useMemo<ApiFacetSourceCandidateWhereInput | null>(() => {
    const conditions: ApiFacetSourceCandidateWhereInput[] = [];
    const facetTypeFilter = getFacetSourceTypeFilter(queryMeta);

    if (inputWhere) {
      conditions.push(inputWhere as ApiFacetSourceCandidateWhereInput);
    }

    if (facetTypeFilter) {
      conditions.push(facetTypeFilter);
    }

    if (excludeIds.length > 0) {
      conditions.push({ id: { _notIn: excludeIds } });
    }

    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0];

    return { _and: conditions };
  }, [excludeIds, inputWhere, queryMeta]);

  const { candidates, totalCount, pageInfo, loading, error } =
    useFacetSourceCandidatesPageQuery({
      first,
      after,
      last,
      before,
      where,
      orderBy: orderBy as ApiFacetSourceCandidateOrderByInput[] | null,
    });

  const data = useMemo(
    () => candidates.map(transformFacetSourceCandidate),
    [candidates],
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

const filterSchema: IFilterSchema[] = [
  {
    key: "facetType",
    label: "Type",
    description: "Filter by source type",
    type: FilterType.Enum,
    operators: [FilterOperator.In],
    payloadKey: "facetType",
    options: Object.values(FacetType).map((value) => ({
      label: FACET_SOURCE_TYPE_LABELS[value],
      value,
    })),
  },
];

const facetSourcePickerColumns: ColDef<FacetSourcePickerEntity>[] = [
  {
    headerName: "Name",
    field: "title",
    cellRenderer: EntityCellRenderer,
    cellRendererParams: {
      fallbackIcon: createElement(DatabaseOutlined),
      subtitleField: "handle",
    },
    flex: 1,
    minWidth: 260,
  },
  {
    headerName: "Type",
    field: "typeLabel",
    minWidth: 170,
  },
];

export const facetSourcePickerConfig: IEntityPickerConfig<
  FacetSourcePickerEntity,
  ApiFacetSourceCandidateWhereInput,
  FacetSourceCandidateOrderField
> = {
  entityType: "facet-source",
  entityName: "Source",
  entityNamePlural: "Sources",
  filterSchema,
  searchEnabled: true,
  columns: facetSourcePickerColumns,
  pageConfig: {
    storageKey: "facet-source-picker-grid-state",
    sortFieldMapping: {
      name: FacetSourceCandidateOrderField.Name,
      facetType: FacetSourceCandidateOrderField.FacetType,
      handle: FacetSourceCandidateOrderField.Handle,
    },
    buildSearchCondition: buildFacetSourceSearchCondition,
    defaultPageSize: 20,
  },
  useData: useFacetSourcesPickerData,
  getRowId: (entity) => entity.id,
};

registerEntityPickerConfig(facetSourcePickerConfig);
