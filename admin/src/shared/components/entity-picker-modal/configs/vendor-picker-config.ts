"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { useVendors } from "@/domains/inventory/products/hooks/use-vendors";
import { EntityCellRenderer } from "../cell-renderers";
import { registerEntityPickerConfig } from ".";
import type {
  IEntityPickerConfig,
  IEntityPickerDataResult,
  IPickableEntity,
} from "../types";
import type { IFilterValue } from "@/layouts/filters/core/types";
import type {
  ApiVendor,
  ApiVendorOrderByInput,
  ApiVendorWhereInput,
} from "@/graphql/types";
import {
  SortDirection,
  VendorOrderField,
} from "@/graphql/types";

interface VendorPickerEntity extends IPickableEntity {
  name: string;
}

const vendorPickerOrderBy: ApiVendorOrderByInput[] = [
  {
    field: VendorOrderField.Name,
    direction: SortDirection.Asc,
  },
];

function transformVendor(vendor: ApiVendor): VendorPickerEntity {
  return {
    id: vendor.id,
    title: vendor.name,
    name: vendor.name,
  };
}

function useVendorsPickerData(options: {
  filters: IFilterValue[];
  search: string;
  pageSize: number;
  excludeIds: string[];
}): IEntityPickerDataResult<VendorPickerEntity> {
  const { search, pageSize, excludeIds } = options;
  const [pageIndex, setPageIndex] = useState(0);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([
    null,
  ]);
  const after = cursorHistory[pageIndex] ?? null;

  useEffect(() => {
    setPageIndex(0);
    setCursorHistory([null]);
  }, [excludeIds, search]);

  const where = useMemo<ApiVendorWhereInput | null>(() => {
    const conditions: ApiVendorWhereInput[] = [];
    const trimmedSearch = search.trim();

    if (excludeIds.length > 0) {
      conditions.push({ id: { _notIn: excludeIds } });
    }

    if (trimmedSearch) {
      conditions.push({ name: { _containsi: trimmedSearch } });
    }

    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0];

    return { _and: conditions };
  }, [excludeIds, search]);

  const { vendors, totalCount, pageInfo, loading, error } = useVendors({
    first: pageSize,
    after,
    where,
    orderBy: vendorPickerOrderBy,
    fetchPolicy: "network-only",
  });

  const data = useMemo(
    () => vendors.map(transformVendor),
    [vendors],
  );

  return {
    data,
    isLoading: loading,
    error,
    pagination: {
      total: totalCount,
      pageSize,
      hasNext: pageInfo?.hasNextPage ?? false,
      hasPrev: pageIndex > 0,
      rangeStart: totalCount > 0 ? pageIndex * pageSize + 1 : 0,
      rangeEnd: Math.min(pageIndex * pageSize + vendors.length, totalCount),
    },
    onNext: () => {
      const nextCursor = pageInfo?.endCursor ?? null;
      if (!nextCursor) return;

      setCursorHistory((history) => {
        const next = history.slice(0, pageIndex + 1);
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

const vendorPickerColumns: ColDef<VendorPickerEntity>[] = [
  {
    headerName: "Vendor",
    field: "title",
    cellRenderer: EntityCellRenderer,
    flex: 1,
    minWidth: 250,
  },
  {
    headerName: "Name",
    field: "name",
    minWidth: 180,
  },
];

export const vendorPickerConfig: IEntityPickerConfig<VendorPickerEntity> = {
  entityType: "vendor",
  entityName: "Vendor",
  entityNamePlural: "Vendors",
  filterSchema: [],
  columns: vendorPickerColumns,
  useData: useVendorsPickerData,
  getRowId: (entity) => entity.id,
};

registerEntityPickerConfig(vendorPickerConfig);
