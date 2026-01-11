"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { createStyles } from "antd-style";
import { Typography, Tag, Divider, Empty, Switch, Flex } from "antd";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  GetRowIdParams,
  ICellRendererParams,
  SelectionChangedEvent,
  RowDragEndEvent,
} from "ag-grid-community";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { useAgGridTheme } from "@/hooks";

import type { IComponentVariantSettingsModalPayload } from "../../../modals";

// Format price helper
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
};

ModuleRegistry.registerModules([AllCommunityModule]);

// ============================================================================
// Types
// ============================================================================

type PriceType = "BASE" | "FIXED" | "MARKUP_PERCENT" | "DISCOUNT_PERCENT" | "MARKUP_FIXED" | "DISCOUNT_FIXED" | "FREE" | "INCLUDED";

interface IVariantRow {
  id: string;
  title: string;
  sku: string;
  price: number;
  stock: number;
  sortIndex: number;
  options?: { optionId: string; value: string }[];
  finalPrice: number;
}

// ============================================================================
// Price calculation helpers
// ============================================================================

const calculateFinalPrice = (
  basePrice: number,
  priceType: PriceType,
  priceValue: number | null
): number => {
  switch (priceType) {
    case "BASE":
      return basePrice;
    case "FIXED":
      return priceValue ?? 0;
    case "MARKUP_PERCENT":
      return basePrice * (1 + (priceValue ?? 0) / 100);
    case "DISCOUNT_PERCENT":
      return basePrice * (1 - (priceValue ?? 0) / 100);
    case "MARKUP_FIXED":
      return basePrice + (priceValue ?? 0);
    case "DISCOUNT_FIXED":
      return basePrice - (priceValue ?? 0);
    case "FREE":
      return 0;
    case "INCLUDED":
      return 0;
    default:
      return basePrice;
  }
};

const formatPriceRule = (priceType: PriceType, priceValue: number | null): string => {
  switch (priceType) {
    case "BASE":
      return "No change";
    case "FIXED":
      return `Fixed: ${formatPrice(priceValue ?? 0)}`;
    case "MARKUP_PERCENT":
      return `+${priceValue ?? 0}%`;
    case "DISCOUNT_PERCENT":
      return `-${priceValue ?? 0}%`;
    case "MARKUP_FIXED":
      return `+${formatPrice(priceValue ?? 0)}`;
    case "DISCOUNT_FIXED":
      return `-${formatPrice(priceValue ?? 0)}`;
    case "FREE":
      return "Free";
    case "INCLUDED":
      return "Included";
    default:
      return "—";
  }
};

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
    "& .ag-row-drag": {
      cursor: "grab",
      color: token.colorTextQuaternary,
      "&:hover": {
        color: token.colorTextSecondary,
      },
    },
    "& .ag-row-dragging": {
      cursor: "grabbing",
    },
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  selectedCount: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
}));

// ============================================================================
// Cell Renderers
// ============================================================================

const BasePriceCellRenderer = ({ data }: ICellRendererParams<IVariantRow>) => {
  if (!data) return null;
  return <span style={{ color: "var(--ant-color-text-secondary)" }}>{formatPrice(data.price)}</span>;
};

const FinalPriceCellRenderer = ({ data }: ICellRendererParams<IVariantRow>) => {
  if (!data) return null;
  return <span style={{ fontWeight: 500 }}>{formatPrice(data.finalPrice)}</span>;
};

// ============================================================================
// Component
// ============================================================================

export const VariantSettingsModal = () => {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const { pop, payload } = useModalStackContext();
  const gridRef = useRef<AgGridReact<IVariantRow>>(null);

  const modalPayload = payload as IComponentVariantSettingsModalPayload | undefined;

  // Extract data from payload
  const {
    productTitle = "Product",
    availableVariantIds: initialVariantIds,
    priceType = "BASE" as PriceType,
    priceValue = null,
    variants = [],
    options = [],
    showAsVariants: initialShowAsVariants = false,
    onSave,
  } = modalPayload ?? {};

  // Local state
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>(
    () => initialVariantIds ?? variants.map((v) => v.id)
  );
  const [showAsVariants, setShowAsVariants] = useState(initialShowAsVariants);

  // Row data for grid (stateful for drag reordering)
  const [rowData, setRowData] = useState<IVariantRow[]>(() =>
    variants.map((v, index) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      sortIndex: index,
      options: v.options,
      finalPrice: calculateFinalPrice(v.price, priceType, priceValue),
    }))
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

  // Handle row drag end
  const handleRowDragEnd = useCallback(
    (event: RowDragEndEvent<IVariantRow>) => {
      const { node, overIndex } = event;
      if (overIndex === undefined || overIndex === null) return;

      const movedItem = node.data;
      if (!movedItem) return;

      setRowData((prev) => {
        const newData = [...prev];
        const oldIndex = newData.findIndex((item) => item.id === movedItem.id);
        newData.splice(oldIndex, 1);
        newData.splice(overIndex, 0, movedItem);

        // Update sort indices
        return newData.map((item, index) => ({
          ...item,
          sortIndex: index,
        }));
      });
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

    // Get selected IDs in the order they appear in rowData
    const orderedSelectedIds = rowData
      .filter((row) => selectedVariantIds.includes(row.id))
      .map((row) => row.id);

    const isAllSelected =
      orderedSelectedIds.length === allVariantIds.length &&
      allVariantIds.every((id) => orderedSelectedIds.includes(id));

    onSave?.({
      availableVariantIds: isAllSelected ? null : orderedSelectedIds,
      showAsVariants,
    });
    pop();
  }, [selectedVariantIds, variants, rowData, showAsVariants, onSave, pop]);

  // Price rule label for display
  const priceRuleLabel = useMemo(
    () => formatPriceRule(priceType, priceValue),
    [priceType, priceValue]
  );

  // Column definitions
  const columnDefs = useMemo<ColDef<IVariantRow>[]>(
    () => [
      {
        headerName: "",
        field: "sortIndex",
        width: 50,
        rowDrag: true,
        suppressMovable: true,
        resizable: false,
      },
      {
        headerName: "Variant",
        field: "title",
        flex: 1,
        minWidth: 120,
        headerCheckboxSelection: true,
        checkboxSelection: true,
      },
      {
        headerName: "Base Price",
        field: "price",
        width: 100,
        cellRenderer: BasePriceCellRenderer,
      },
      {
        headerName: "Rule",
        field: "price",
        width: 90,
        valueGetter: () => priceRuleLabel,
        cellStyle: { color: "var(--ant-color-text-secondary)", fontSize: 12 },
      },
      {
        headerName: "Final Price",
        field: "finalPrice",
        width: 100,
        cellRenderer: FinalPriceCellRenderer,
      },
    ],
    [priceRuleLabel]
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
          <div className={styles.sectionHeader}>
            <Typography.Text className={styles.sectionTitle} style={{ marginBottom: 0 }}>
              Variants
            </Typography.Text>
            <Typography.Text className={styles.selectedCount}>
              {selectedVariantIds.length} of {variants.length} selected
            </Typography.Text>
          </div>

          {variants.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No variants"
            />
          ) : (
            <div className={styles.gridWrapper}>
              <AgGridReact<IVariantRow>
                ref={gridRef}
                theme={agGridTheme}
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                getRowId={getRowId}
                rowSelection="multiple"
                rowMultiSelectWithClick
                suppressRowClickSelection={false}
                rowDragManaged
                animateRows
                suppressMovableColumns
                onSelectionChanged={handleSelectionChanged}
                onRowDragEnd={handleRowDragEnd}
                onGridReady={onGridReady}
                rowHeight={44}
                headerHeight={36}
              />
            </div>
          )}
        </div>

        <Divider style={{ margin: "12px 0" }} />

        {/* Show as variants switch */}
        <Flex justify="space-between" align="center">
          <div>
            <Typography.Text strong>Show as variants</Typography.Text>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Display each variant as a separate row in the components table
            </Typography.Text>
          </div>
          <Switch
            checked={showAsVariants}
            onChange={setShowAsVariants}
          />
        </Flex>
      </div>
    </ModalLayout>
  );
};

export default VariantSettingsModal;
