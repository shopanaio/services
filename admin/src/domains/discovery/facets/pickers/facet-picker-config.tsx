"use client";

import { useMemo } from "react";
import { Flex, Tag } from "antd";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import type { IFilterValue } from "@/layouts/filters/core/types";
import { registerEntityPickerConfig } from "@/shared/components/entity-picker-modal/configs";
import type {
  IEntityPickerConfig,
  IEntityPickerDataResult,
  IPickableEntity,
} from "@/shared/components/entity-picker-modal/types";
import type { FacetScopeType, FacetType } from "@/graphql/types";
import { useFacets } from "../hooks";
import { FACET_UI_MAPPINGS, getFacetScopeLabel } from "../mappers";
import { facetTypeFilterSchema } from "../page/filter-schema";
import { FacetPickerNameCell } from "./facet-picker-name-cell";

export interface FacetPickerEntity extends IPickableEntity {
  slug: string;
  facetType: FacetType;
  typeLabel: string;
  scopes: FacetScopeType[];
}

function valuesFromFilter(filter: IFilterValue): unknown[] {
  return Array.isArray(filter.value) ? filter.value : [filter.value];
}

function parseCursor(cursor: string | null | undefined): number | null {
  if (!cursor) return null;
  const value = Number(cursor);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function useFacetPickerData(options: {
  filters: IFilterValue[];
  search: string;
  pageSize: number;
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  excludeIds: string[];
}): IEntityPickerDataResult<FacetPickerEntity> {
  const { facets, loading, error } = useFacets();
  const { filters, search, pageSize, first, after, last, before, excludeIds } = options;

  const filteredFacets = useMemo(() => {
    const excluded = new Set(excludeIds);
    const query = search.trim().toLocaleLowerCase();
    const facetTypeFilter = filters.find((filter) => filter.payloadKey === "facetType");
    const facetTypes = facetTypeFilter ? valuesFromFilter(facetTypeFilter) : [];

    return facets.filter((facet) => {
      if (excluded.has(facet.id)) return false;
      if (facetTypes.length > 0 && !facetTypes.includes(facet.facetType)) {
        return false;
      }
      if (!query) return true;

      return (
        facet.label.toLocaleLowerCase().includes(query) ||
        facet.slug.toLocaleLowerCase().includes(query) ||
        FACET_UI_MAPPINGS.facetTypes[facet.facetType].label.toLocaleLowerCase().includes(query)
      );
    });
  }, [excludeIds, facets, filters, search]);

  const total = filteredFacets.length;
  const beforeOffset = parseCursor(before);
  const afterOffset = parseCursor(after);
  const requestedSize = beforeOffset === null ? (first ?? pageSize) : (last ?? pageSize);
  const end =
    beforeOffset === null
      ? Math.min(total, (afterOffset ?? -1) + 1 + requestedSize)
      : Math.min(total, beforeOffset);
  const start =
    beforeOffset === null
      ? Math.min(total, (afterOffset ?? -1) + 1)
      : Math.max(0, end - requestedSize);
  const page = filteredFacets.slice(start, end);

  const data = useMemo<FacetPickerEntity[]>(
    () =>
      page.map((facet) => ({
        id: facet.id,
        title: facet.label,
        slug: facet.slug,
        facetType: facet.facetType,
        typeLabel: FACET_UI_MAPPINGS.facetTypes[facet.facetType].label,
        scopes: facet.scopes,
      })),
    [page],
  );

  return {
    data,
    isLoading: loading,
    error,
    pagination: {
      total,
      pageSize,
      hasNext: end < total,
      hasPrev: start > 0,
      startCursor: page.length > 0 ? String(start) : null,
      endCursor: page.length > 0 ? String(end - 1) : null,
    },
  };
}

const facetPickerColumns: ColDef<FacetPickerEntity>[] = [
  {
    headerName: "Facet",
    field: "title",
    cellRenderer: FacetPickerNameCell,
    flex: 1,
    minWidth: 280,
  },
  {
    headerName: "Type",
    field: "typeLabel",
    minWidth: 170,
  },
  {
    headerName: "Available in",
    field: "scopes",
    minWidth: 210,
    cellRenderer: ({ value }: ICellRendererParams<FacetPickerEntity, FacetScopeType[]>) => (
      <Flex gap={4} wrap>
        {(value ?? []).map((scope) => (
          <Tag key={scope} style={{ marginInlineEnd: 0 }}>
            {getFacetScopeLabel(scope)}
          </Tag>
        ))}
      </Flex>
    ),
  },
];

export const facetPickerConfig: IEntityPickerConfig<FacetPickerEntity> = {
  entityType: "facet",
  entityName: "Facet",
  entityNamePlural: "Facets",
  filterSchema: [facetTypeFilterSchema],
  searchEnabled: true,
  columns: facetPickerColumns,
  pageConfig: {
    storageKey: "facet-picker-grid-state",
    sortFieldMapping: {},
    buildSearchCondition: (search) => ({ search }),
    defaultPageSize: 20,
  },
  useData: useFacetPickerData,
  getRowId: (entity) => entity.id,
};

registerEntityPickerConfig(facetPickerConfig);
