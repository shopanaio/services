"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
  SelectionChangedEvent,
  type GridState,
  type RowStyle,
} from "ag-grid-community";
import { createStyles } from "antd-style";
import { Skeleton } from "antd";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import type { IEntityPickerContentProps, IPickableEntity } from "./types";
import { useAgGridTheme, usePageConfig } from "@/hooks";
import type { FilterTransformer, SortFieldMapping } from "@/hooks";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

const EMPTY_SORT_FIELD_MAPPING: SortFieldMapping<string> = {};

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    minHeight: 0,
    flex: 1,
  },
  toolbar: {
    paddingTop: token.paddingSM,
    flexShrink: 0,
    marginBottom: token.marginSM,
  },
  gridContainer: {
    flex: 1,
    minHeight: 400,
    width: "100%",
  },
  gridSkeleton: {
    flex: 1,
    minHeight: 400,
    width: "100%",
    padding: token.padding,
    boxSizing: "border-box",
  },
  pagination: {
    flexShrink: 0,
  },
}));

function areStringArraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function withoutPersistedSelection(
  state: GridState | undefined,
): GridState | undefined {
  if (!state) return undefined;
  const { rowSelection: _rowSelection, ...gridState } = state;
  return gridState;
}

function getMapEntitiesInOrder<T extends IPickableEntity>(
  entityById: Map<string, T>,
  ids: string[],
) {
  return ids
    .map((id) => entityById.get(id))
    .filter((entity): entity is T => Boolean(entity));
}

export function EntityPickerContent<T extends IPickableEntity>({
  config,
  selectionMode,
  initialSelection,
  excludeIds,
  maxSelection,
  queryMeta,
  onSelectionChange,
}: IEntityPickerContentProps<T>) {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<T>>(null);
  const selectedIdsRef = useRef<string[]>(initialSelection);
  const selectedEntityByIdRef = useRef<Map<string, T>>(new Map());
  const lastEmittedSelectionRef = useRef<{
    ids: string[];
    entityIds: string[];
  }>({
    ids: [],
    entityIds: [],
  });
  const [isGridReady, setIsGridReady] = useState(false);
  const [selectedCount, setSelectedCount] = useState(initialSelection.length);
  const hasSharedPageConfig = Boolean(config.pageConfig);
  const pageConfig = usePageConfig<T, object, string>({
    gridRef,
    storageKey:
      config.pageConfig?.storageKey ?? `${config.entityType}-picker-grid-state`,
    filterSchema: config.filterSchema,
    sortFieldMapping:
      (config.pageConfig?.sortFieldMapping ??
        EMPTY_SORT_FIELD_MAPPING) as SortFieldMapping<string>,
    defaultPageSize: config.pageConfig?.defaultPageSize,
    pageSizeOptions: config.pageConfig?.pageSizeOptions,
    buildSearchCondition: config.pageConfig?.buildSearchCondition as
      | ((search: string) => Partial<object>)
      | undefined,
    filterTransformers: config.pageConfig?.filterTransformers as
      | Record<string, FilterTransformer<object>>
      | undefined,
  });
  const showSearch = config.searchEnabled !== false;
  const showToolbar = showSearch || config.filterSchema.length > 0;
  const initialGridState = useMemo(
    () => withoutPersistedSelection(pageConfig.gridStateProps.initialState),
    [pageConfig.gridStateProps.initialState],
  );

  // Data fetching via config hook
  const {
    data,
    isLoading,
    pagination,
    onNext,
    onPrev,
    onPageSizeChange,
  } = config.useData({
      filters: pageConfig.filters,
      search: pageConfig.searchValue,
      pageSize: pageConfig.pageSize,
      first: pageConfig.first,
      after: pageConfig.after,
      last: pageConfig.last,
      before: pageConfig.before,
      where: pageConfig.where ?? null,
      orderBy: pageConfig.orderBy ?? null,
      excludeIds,
      queryMeta,
    });

  // Filter out excluded IDs
  const filteredData = useMemo(() => {
    if (!excludeIds.length) return data;
    return data.filter((item) => !excludeIds.includes(config.getRowId(item)));
  }, [data, excludeIds, config]);
  const showInitialLoadingSkeleton = isLoading && filteredData.length === 0;

  const emitSelectionChange = useCallback(
    (selectedIds: string[]) => {
      const selectedEntities = getMapEntitiesInOrder(
        selectedEntityByIdRef.current,
        selectedIds,
      );
      const selectedEntityIds = selectedEntities.map((entity) =>
        config.getRowId(entity),
      );
      const lastSelection = lastEmittedSelectionRef.current;

      if (
        areStringArraysEqual(lastSelection.ids, selectedIds) &&
        areStringArraysEqual(lastSelection.entityIds, selectedEntityIds)
      ) {
        return;
      }

      lastEmittedSelectionRef.current = {
        ids: [...selectedIds],
        entityIds: selectedEntityIds,
      };
      onSelectionChange(selectedIds, selectedEntities);
    },
    [config, onSelectionChange],
  );

  // Handle selection changes
  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<T>) => {
      const missingLockedRows = filteredData.filter((item) => {
        if (!config.isRowSelectionLocked?.(item)) return false;
        const node = event.api.getRowNode(config.getRowId(item));
        return node && !node.isSelected();
      });

      if (missingLockedRows.length > 0) {
        for (const item of missingLockedRows) {
          event.api.getRowNode(config.getRowId(item))?.setSelected(true);
        }
        return;
      }

      const selectedRows = event.api.getSelectedRows();
      const currentPageIds = new Set(
        filteredData.map((item) => config.getRowId(item)),
      );
      const selectedPageIds = selectedRows.map((row) => config.getRowId(row));
      const nextEntityById =
        selectionMode === "single"
          ? new Map<string, T>()
          : new Map(selectedEntityByIdRef.current);

      for (const id of currentPageIds) {
        nextEntityById.delete(id);
      }

      for (const row of selectedRows) {
        nextEntityById.set(config.getRowId(row), row);
      }

      const retainedIds =
        selectionMode === "single"
          ? []
          : selectedIdsRef.current.filter((id) => !currentPageIds.has(id));
      const selectedIds =
        selectionMode === "single"
          ? selectedPageIds.slice(0, 1)
          : [...retainedIds, ...selectedPageIds];

      selectedEntityByIdRef.current = nextEntityById;

      if (areStringArraysEqual(selectedIdsRef.current, selectedIds)) {
        emitSelectionChange(selectedIds);
        return;
      }

      selectedIdsRef.current = selectedIds;
      setSelectedCount(selectedIds.length);
      emitSelectionChange(selectedIds);
    },
    [config, emitSelectionChange, filteredData, selectionMode],
  );

  // Handle page size change
  const handlePageSizeChange = useCallback(
    (size: number) => {
      pageConfig.setPageSize(size);
      onPageSizeChange?.(size);
    },
    [onPageSizeChange, pageConfig],
  );

  const handleNextPage = useCallback(() => {
    if (!hasSharedPageConfig) {
      onNext?.();
      return;
    }

    if (pagination.endCursor) {
      pageConfig.goToNextPage(pagination.endCursor);
    }
  }, [hasSharedPageConfig, onNext, pageConfig, pagination.endCursor]);

  const handlePrevPage = useCallback(() => {
    if (!hasSharedPageConfig) {
      onPrev?.();
      return;
    }

    if (pagination.startCursor) {
      pageConfig.goToPrevPage(pagination.startCursor);
    }
  }, [hasSharedPageConfig, onPrev, pageConfig, pagination.startCursor]);

  const paginationProps = useMemo(() => {
    if (!hasSharedPageConfig) {
      return {
        ...pagination,
        rangeStart: pagination.rangeStart ?? 0,
        rangeEnd: pagination.rangeEnd ?? 0,
      };
    }

    return {
      ...pagination,
      pageSize: pageConfig.pageSize,
      rangeStart: pageConfig.getRangeStart(filteredData.length),
      rangeEnd: Math.min(
        pageConfig.getRangeEnd(filteredData.length),
        pagination.total,
      ),
    };
  }, [filteredData.length, hasSharedPageConfig, pageConfig, pagination]);

  // Sync visible grid rows with the accumulated selection and hydrate entities
  // for ids that were selected before the current page was loaded.
  useEffect(() => {
    if (!isGridReady) return;

    const api = gridRef.current?.api;
    if (!api) return;

    const selectedIds = selectedIdsRef.current;
    const selectedIdSet = new Set(selectedIds);
    const nextEntityById = new Map(selectedEntityByIdRef.current);
    let didHydrateSelectedEntity = false;

    api.forEachNode((node) => {
      if (!node.data) return;

      const rowId = config.getRowId(node.data);
      const selectionLocked = config.isRowSelectionLocked?.(node.data) ?? false;
      const shouldBeSelected =
        selectedIdSet.has(rowId) &&
        (selectionLocked || !config.isRowDisabled?.(node.data));

      if (node.isSelected() !== shouldBeSelected) {
        node.setSelected(shouldBeSelected);
      }

      if (shouldBeSelected && nextEntityById.get(rowId) !== node.data) {
        nextEntityById.set(rowId, node.data);
        didHydrateSelectedEntity = true;
      }
    });

    if (didHydrateSelectedEntity) {
      selectedEntityByIdRef.current = nextEntityById;
      emitSelectionChange(selectedIds);
    }
  }, [isGridReady, filteredData, config, emitSelectionChange]);

  const handleGridReady = useCallback(() => {
    setIsGridReady(true);
  }, []);

  return (
    <div
      className={styles.container}
      data-testid={`${config.entityType}-picker-content`}
    >
      {showToolbar && (
        <div className={styles.toolbar}>
          <FilterWidget
            {...pageConfig.filterWidgetProps}
            searchProps={
              showSearch
                ? pageConfig.filterWidgetProps.searchProps
                : undefined
            }
            searchPlaceholder={`Search ${config.entityNamePlural.toLowerCase()}...`}
          />
        </div>
      )}

      {showInitialLoadingSkeleton ? (
        <div
          className={styles.gridSkeleton}
          data-testid={`${config.entityType}-picker-loading`}
        >
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      ) : (
        <div
          className={styles.gridContainer}
          data-testid={`${config.entityType}-picker-grid`}
        >
          <AgGridReact<T>
            ref={gridRef}
            theme={agGridTheme}
            rowData={filteredData}
            columnDefs={config.columns}
            getRowId={(params) => config.getRowId(params.data)}
            rowHeight={52}
            headerHeight={40}
            rowSelection={{
              mode: selectionMode === "single" ? "singleRow" : "multiRow",
              checkboxes: true,
              headerCheckbox:
                selectionMode === "multi" && maxSelection === undefined,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
              isRowSelectable: (node) => {
                if (!node.data) return false;
                if (config.isRowSelectionLocked?.(node.data)) return true;
                if (config.isRowDisabled?.(node.data)) return false;
                const id = config.getRowId(node.data);
                return (
                  selectedIdsRef.current.includes(id) ||
                  maxSelection === undefined ||
                  selectedCount < maxSelection
                );
              },
            }}
            selectionColumnDef={{
              cellStyle: { display: "flex", alignItems: "center" },
              tooltipValueGetter: (params) => {
                if (!params.data || maxSelection === undefined) return undefined;
                const id = config.getRowId(params.data);
                return selectedCount >= maxSelection &&
                  !selectedIdsRef.current.includes(id)
                  ? `Maximum ${maxSelection} selections reached`
                  : undefined;
              },
            }}
            suppressCellFocus
            suppressMovableColumns
            onSelectionChanged={handleSelectionChanged}
            onGridReady={handleGridReady}
            onSortChanged={pageConfig.onSortChanged}
            isRowSelectable={(node) => {
              if (!node.data) return false;
              if (config.isRowSelectionLocked?.(node.data)) return true;
              if (config.isRowDisabled?.(node.data)) return false;
              const id = config.getRowId(node.data);
              return (
                selectedIdsRef.current.includes(id) ||
                maxSelection === undefined ||
                selectedCount < maxSelection
              );
            }}
            getRowStyle={(params): RowStyle => {
              const disabled =
                params.data &&
                (config.isRowDisabled?.(params.data) ||
                  config.isRowSelectionLocked?.(params.data));
              return disabled
                ? {
                    cursor: "not-allowed",
                    opacity: 0.58,
                    pointerEvents: "none",
                  }
                : { cursor: "pointer" };
            }}
            loading={isLoading}
            initialState={initialGridState}
            onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
            defaultColDef={{
              resizable: false,
              sortable: Boolean(config.pageConfig?.sortFieldMapping),
              comparator: () => 0,
              cellStyle: { display: "flex", alignItems: "center" },
            }}
          />
        </div>
      )}

      {/* Pagination */}
      <div className={styles.pagination}>
        <CursorPagination
          total={paginationProps.total}
          rangeStart={paginationProps.rangeStart}
          rangeEnd={paginationProps.rangeEnd}
          pageSize={paginationProps.pageSize}
          hasNext={paginationProps.hasNext}
          hasPrev={paginationProps.hasPrev}
          onNext={handleNextPage}
          onPrev={handlePrevPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
}
