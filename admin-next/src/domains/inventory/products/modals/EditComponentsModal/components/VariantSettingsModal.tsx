"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { createStyles } from "antd-style";
import { Typography, Tag, Divider, Empty, Flex } from "antd";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  GetRowIdParams,
  ICellRendererParams,
  SelectionChangedEvent,
} from "ag-grid-community";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";

import type { IComponentVariantSettingsModalPayload } from "../../../modals";
import { formatPrice } from "../mocks/mockData";

ModuleRegistry.registerModules([AllCommunityModule]);

// ============================================================================
// Types
// ============================================================================

interface IVariantRow {
  id: string;
  title: string;
  sku: string;
  price: number;
  stock: number;
  options?: { optionId: string; value: string }[];
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  content: {
    padding: "0 24px 24px",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: token.colorTextSecondary,
  },
  optionGroup: {
    marginBottom: 16,
  },
  optionGroupTitle: {
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 8,
    color: token.colorText,
  },
  optionValues: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  gridWrapper: {
    width: "100%",
    height: 300,
    "& .ag-header-cell": {
      fontSize: 12,
      fontWeight: 500,
    },
    "& .ag-cell": {
      display: "flex",
      alignItems: "center",
      lineHeight: 1.4,
    },
    "& .ag-cell-wrapper": {
      width: "100%",
      display: "flex",
      alignItems: "center",
    },
  },
  summary: {
    padding: "12px 16px",
    background: token.colorBgLayout,
    borderRadius: token.borderRadius,
    marginTop: 16,
  },
  summaryText: {
    fontSize: 13,
  },
  stockTag: {
    margin: 0,
  },
}));

// ============================================================================
// Cell Renderers
// ============================================================================

const StockCellRenderer = ({ data }: ICellRendererParams<IVariantRow>) => {
  const { styles } = useStyles();
  if (!data) return null;

  const isOutOfStock = data.stock === 0;

  return isOutOfStock ? (
    <Tag color="red" className={styles.stockTag}>
      Out of stock
    </Tag>
  ) : (
    <Tag color="green" className={styles.stockTag}>
      {data.stock} in stock
    </Tag>
  );
};

const PriceCellRenderer = ({ data }: ICellRendererParams<IVariantRow>) => {
  if (!data) return null;
  return <span style={{ fontWeight: 500 }}>{formatPrice(data.price)}</span>;
};

// ============================================================================
// Component
// ============================================================================

export const VariantSettingsModal = () => {
  const { styles } = useStyles();
  const { pop, payload } = useModalStackContext();
  const gridRef = useRef<AgGridReact<IVariantRow>>(null);

  const modalPayload = payload as IComponentVariantSettingsModalPayload | undefined;

  // Extract data from payload
  const {
    productTitle = "Product",
    availableVariantIds: initialVariantIds,
    variants = [],
    options = [],
    onSave,
  } = modalPayload ?? {};

  // Local state
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>(
    () => initialVariantIds ?? variants.map((v) => v.id)
  );

  // Row data for grid
  const rowData = useMemo<IVariantRow[]>(
    () =>
      variants.map((v) => ({
        id: v.id,
        title: v.title,
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        options: v.options,
      })),
    [variants]
  );

  // Get unique option values grouped by option
  const optionGroups = useMemo(() => {
    if (!options || options.length === 0) return [];

    return options.map((option) => {
      // Find which values are available based on selected variants
      const selectedVariants = variants.filter((v) =>
        selectedVariantIds.includes(v.id)
      );

      const availableValues = new Set(
        selectedVariants.flatMap(
          (v) =>
            v.options
              ?.filter((o) => o.optionId === option.id)
              .map((o) => o.value) ?? []
        )
      );

      return {
        id: option.id,
        name: option.name,
        values: option.values.map((value) => ({
          value,
          isSelected: availableValues.has(value),
          count: selectedVariants.filter((v) =>
            v.options?.some(
              (o) => o.optionId === option.id && o.value === value
            )
          ).length,
        })),
      };
    });
  }, [options, variants, selectedVariantIds]);

  // Handle selection change from grid
  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<IVariantRow>) => {
      const selectedNodes = event.api.getSelectedNodes();
      const selectedIds = selectedNodes
        .map((node) => node.data?.id)
        .filter((id): id is string => !!id);
      setSelectedVariantIds(selectedIds);
    },
    []
  );

  // Toggle by option value
  const handleOptionValueToggle = useCallback(
    (optionId: string, value: string, checked: boolean) => {
      const variantsWithValue = variants.filter((v) =>
        v.options?.some((o) => o.optionId === optionId && o.value === value)
      );

      if (checked) {
        setSelectedVariantIds((prev) => [
          ...new Set([...prev, ...variantsWithValue.map((v) => v.id)]),
        ]);
      } else {
        const variantIdsToRemove = variantsWithValue.map((v) => v.id);
        setSelectedVariantIds((prev) =>
          prev.filter((id) => !variantIdsToRemove.includes(id))
        );
      }
    },
    [variants]
  );

  // Save changes
  const handleSave = useCallback(() => {
    const allVariantIds = variants.map((v) => v.id);
    const isAllSelected =
      selectedVariantIds.length === allVariantIds.length &&
      allVariantIds.every((id) => selectedVariantIds.includes(id));

    onSave?.({
      availableVariantIds: isAllSelected ? null : selectedVariantIds,
    });
    pop();
  }, [selectedVariantIds, variants, onSave, pop]);

  // Column definitions
  const columnDefs = useMemo<ColDef<IVariantRow>[]>(
    () => [
      {
        headerName: "Variant",
        field: "title",
        flex: 2,
        minWidth: 150,
        headerCheckboxSelection: true,
        checkboxSelection: true,
      },
      {
        headerName: "SKU",
        field: "sku",
        width: 120,
      },
      {
        headerName: "Stock",
        field: "stock",
        width: 120,
        cellRenderer: StockCellRenderer,
      },
      {
        headerName: "Price",
        field: "price",
        width: 100,
        cellRenderer: PriceCellRenderer,
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: false,
      sortable: true,
      suppressMovable: true,
    }),
    []
  );

  const getRowId = useCallback(
    (params: GetRowIdParams<IVariantRow>) => params.data.id,
    []
  );

  // Sync grid selection with state
  const onGridReady = useCallback(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.forEachNode((node) => {
        if (node.data && selectedVariantIds.includes(node.data.id)) {
          node.setSelected(true);
        }
      });
    }
  }, [selectedVariantIds]);

  // Update grid selection when option filters change
  const updateGridSelection = useCallback(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.forEachNode((node) => {
        if (node.data) {
          const shouldSelect = selectedVariantIds.includes(node.data.id);
          if (node.isSelected() !== shouldSelect) {
            node.setSelected(shouldSelect);
          }
        }
      });
    }
  }, [selectedVariantIds]);

  // Sync selection when selectedVariantIds changes from option filters
  useMemo(() => {
    updateGridSelection();
  }, [updateGridSelection]);

  return (
    <ModalLayout
      name="component-variant-settings"
      width={600}
      header={
        <ModalHeader
          name="component-variant-settings"
          title={`Variant Settings: ${productTitle}`}
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
          }}
        />
      }
    >
      <div className={styles.content}>
        {/* Option Filters */}
        {optionGroups.length > 0 && (
          <div className={styles.section}>
            <Typography.Text className={styles.sectionTitle}>
              Filter by Options
            </Typography.Text>
            {optionGroups.map((group) => (
              <div key={group.id} className={styles.optionGroup}>
                <Typography.Text className={styles.optionGroupTitle}>
                  {group.name}
                </Typography.Text>
                <div className={styles.optionValues}>
                  {group.values.map(({ value, isSelected, count }) => (
                    <Tag.CheckableTag
                      key={value}
                      checked={isSelected}
                      onChange={(checked) =>
                        handleOptionValueToggle(group.id, value, checked)
                      }
                    >
                      {value} ({count})
                    </Tag.CheckableTag>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <Divider style={{ margin: "12px 0" }} />

        {/* Variant Table */}
        <div className={styles.section}>
          <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
            <Typography.Text className={styles.sectionTitle} style={{ margin: 0 }}>
              Available Variants
            </Typography.Text>
          </Flex>

          {variants.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No variants"
            />
          ) : (
            <div className={styles.gridWrapper}>
              <AgGridReact<IVariantRow>
                ref={gridRef}
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                getRowId={getRowId}
                rowSelection="multiple"
                rowMultiSelectWithClick
                suppressRowClickSelection={false}
                onSelectionChanged={handleSelectionChanged}
                onGridReady={onGridReady}
                rowHeight={44}
                headerHeight={36}
              />
            </div>
          )}
        </div>

        {/* Summary */}
        <div className={styles.summary}>
          <Typography.Text className={styles.summaryText}>
            <strong>{selectedVariantIds.length}</strong> of {variants.length} variants
            selected
          </Typography.Text>
        </div>
      </div>
    </ModalLayout>
  );
};

export default VariantSettingsModal;
