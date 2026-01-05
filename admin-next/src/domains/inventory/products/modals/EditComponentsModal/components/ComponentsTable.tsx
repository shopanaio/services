"use client";

import { useMemo, useCallback, useRef, useState } from "react";
import { createStyles } from "antd-style";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  GetRowIdParams,
  ICellRendererParams,
  RowDragEndEvent,
  CellValueChangedEvent,
} from "ag-grid-community";
import { Button, Dropdown, Select, Checkbox } from "antd";
import {
  MoreOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";

import {
  ComponentItemType,
  ComponentPriceType,
  PRICE_RULE_OPTIONS,
  type IComponentItem,
  type IPricingRuleTemplate,
} from "../types";
import { getProductById, getVariantById, calculateFinalPrice } from "../mocks/mockData";

ModuleRegistry.registerModules([AllCommunityModule]);

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  gridWrapper: {
    width: "100%",
    minHeight: 200,
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
  productCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  productImage: {
    width: 36,
    height: 36,
    borderRadius: 4,
    objectFit: "cover",
    background: token.colorBgLayout,
    flexShrink: 0,
  },
  productInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.3,
  },
  variantsLink: {
    fontSize: 12,
    padding: 0,
    height: "auto",
    lineHeight: 1.3,
  },
  unavailable: {
    opacity: 0.5,
  },
}));

// ============================================================================
// Types
// ============================================================================

interface IComponentsTableProps {
  items: IComponentItem[];
  onItemsChange: (items: IComponentItem[]) => void;
  onEditVariants?: (item: IComponentItem) => void;
  pricingTemplates: IPricingRuleTemplate[];
  bulkEditMode: boolean;
  selectedCount: number;
  onSelectionChange: (selectedIds: Set<string>) => void;
}

// ============================================================================
// Cell Renderers
// ============================================================================

interface IProductCellRendererProps extends ICellRendererParams<IComponentItem> {
  onEditVariants?: (item: IComponentItem) => void;
}

const ProductCellRenderer = ({ data, onEditVariants }: IProductCellRendererProps) => {
  const { styles, cx } = useStyles();
  if (!data) return null;

  const product = getProductById(data.productId);
  const variant =
    data.variantId && product
      ? getVariantById(data.productId, data.variantId)
      : null;

  const title = data.customTitle || variant?.title || product?.title || "Unknown";
  const imageUrl = variant?.imageUrl || product?.imageUrl || "/placeholder.png";

  const variantsCount =
    data.itemType === ComponentItemType.PRODUCT_WITH_VARIANTS
      ? data.availableVariantIds?.length || product?.variants?.length || 0
      : null;

  return (
    <div className={cx(styles.productCell, !data.isAvailable && styles.unavailable)}>
      <img src={imageUrl || "/placeholder.png"} className={styles.productImage} alt="" />
      <div className={styles.productInfo}>
        <span className={styles.productTitle}>{title}</span>
        {variantsCount !== null && onEditVariants && (
          <Button
            type="link"
            size="small"
            className={styles.variantsLink}
            onClick={() => onEditVariants(data)}
          >
            {variantsCount} variants
          </Button>
        )}
      </div>
    </div>
  );
};


// ============================================================================
// Checkbox Cell Renderer (for bulk edit)
// ============================================================================

interface ICheckboxCellRendererProps extends ICellRendererParams<IComponentItem> {
  selectedIds: Set<string>;
  onToggle: (itemId: string) => void;
}

const CheckboxCellRenderer = ({
  data,
  selectedIds,
  onToggle,
}: ICheckboxCellRendererProps) => {
  if (!data) return null;

  return (
    <Checkbox
      checked={selectedIds.has(data.id)}
      onChange={() => onToggle(data.id)}
    />
  );
};

// ============================================================================
// Price Rule Cell Renderer
// ============================================================================

interface IPriceRuleCellRendererProps extends ICellRendererParams<IComponentItem> {
  pricingTemplates: IPricingRuleTemplate[];
  onPriceRuleChange: (
    itemId: string,
    priceType: ComponentPriceType,
    priceValue: number | null,
    templateId?: string
  ) => void;
}

const TEMPLATE_PREFIX = "tpl:";

const PriceRuleCellRenderer = ({
  data,
  pricingTemplates,
  onPriceRuleChange,
}: IPriceRuleCellRendererProps) => {
  if (!data) return null;

  // Build options: templates first, then custom rules
  const options = [
    // Templates group
    ...(pricingTemplates.length > 0
      ? [
          {
            label: "Templates",
            options: pricingTemplates.map((tpl) => {
              const rule = PRICE_RULE_OPTIONS.find((r) => r.value === tpl.priceType);
              const valueStr =
                tpl.priceValue !== null && rule?.valueSuffix
                  ? ` (${tpl.priceValue}${rule.valueSuffix})`
                  : "";
              return {
                label: `${tpl.name}${valueStr}`,
                value: `${TEMPLATE_PREFIX}${tpl.id}`,
              };
            }),
          },
        ]
      : []),
    // Custom rules group
    {
      label: "Custom",
      options: PRICE_RULE_OPTIONS.map((opt) => ({
        label: opt.label,
        value: opt.value,
      })),
    },
  ];

  // Determine current value
  const currentValue = data.templateId
    ? `${TEMPLATE_PREFIX}${data.templateId}`
    : data.priceType;

  const handleChange = (value: string) => {
    if (value.startsWith(TEMPLATE_PREFIX)) {
      // Template selected
      const templateId = value.replace(TEMPLATE_PREFIX, "");
      const template = pricingTemplates.find((t) => t.id === templateId);
      if (template) {
        onPriceRuleChange(data.id, template.priceType, template.priceValue, templateId);
      }
    } else {
      // Custom rule selected
      const priceType = value as ComponentPriceType;
      const rule = PRICE_RULE_OPTIONS.find((r) => r.value === priceType);
      const priceValue = rule?.requiresValue ? data.priceValue ?? 0 : null;
      onPriceRuleChange(data.id, priceType, priceValue, undefined);
    }
  };

  return (
    <Select
      value={currentValue}
      onChange={handleChange}
      options={options}
      size="small"
      style={{ width: "100%" }}
      popupMatchSelectWidth={false}
    />
  );
};

// ============================================================================
// Actions Cell Renderer
// ============================================================================

interface IActionsCellRendererProps extends ICellRendererParams<IComponentItem> {
  onDelete: (itemId: string) => void;
  onDuplicate: (itemId: string) => void;
  onEditVariants?: (item: IComponentItem) => void;
}

const ActionsCellRenderer = ({
  data,
  onDelete,
  onDuplicate,
  onEditVariants,
}: IActionsCellRendererProps) => {
  if (!data) return null;

  const menuItems: MenuProps["items"] = [
    {
      key: "duplicate",
      icon: <CopyOutlined />,
      label: "Duplicate",
      onClick: () => onDuplicate(data.id),
    },
    ...(data.itemType === ComponentItemType.PRODUCT_WITH_VARIANTS && onEditVariants
      ? [
          {
            key: "variants",
            icon: <EditOutlined />,
            label: "Edit variants",
            onClick: () => onEditVariants(data),
          },
        ]
      : []),
    { type: "divider" as const },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Delete",
      danger: true,
      onClick: () => onDelete(data.id),
    },
  ];

  return (
    <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
      <Button type="text" size="small" icon={<MoreOutlined />} />
    </Dropdown>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ComponentsTable = ({
  items,
  onItemsChange,
  onEditVariants,
  pricingTemplates,
  bulkEditMode,
  selectedCount,
  onSelectionChange,
}: IComponentsTableProps) => {
  const { styles } = useStyles();
  const gridRef = useRef<AgGridReact<IComponentItem>>(null);

  // Selected items for bulk edit (internal state synced with parent)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sync selection with parent
  const updateSelection = useCallback(
    (newSelectedIds: Set<string>) => {
      setSelectedIds(newSelectedIds);
      onSelectionChange(newSelectedIds);
    },
    [onSelectionChange]
  );

  // Clear selection when bulk edit mode is turned off
  const prevBulkEditMode = useRef(bulkEditMode);
  if (prevBulkEditMode.current && !bulkEditMode) {
    setSelectedIds(new Set());
  }
  prevBulkEditMode.current = bulkEditMode;

  // Toggle selection for a single item
  const handleToggleSelection = useCallback(
    (itemId: string) => {
      const next = new Set(selectedIds);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      updateSelection(next);
    },
    [selectedIds, updateSelection]
  );

  // Toggle all items
  const handleToggleAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      updateSelection(new Set());
    } else {
      updateSelection(new Set(items.map((item) => item.id)));
    }
  }, [items, selectedIds.size, updateSelection]);

  // Handle price rule change (from custom cell renderer)
  const handlePriceRuleChange = useCallback(
    (
      itemId: string,
      priceType: ComponentPriceType,
      priceValue: number | null,
      templateId?: string
    ) => {
      const newItems = items.map((item) => {
        if (item.id !== itemId) return item;

        const finalPrice = calculateFinalPrice(item.basePrice, priceType, priceValue);

        return {
          ...item,
          priceType,
          priceValue,
          templateId,
          finalPrice,
        };
      });
      onItemsChange(newItems);
    },
    [items, onItemsChange]
  );

  // Handle value change (from AG Grid editor)
  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<IComponentItem>) => {
      const field = event.colDef?.field;
      if (!event.data || field !== "priceValue") return;

      const newItems = items.map((item) => {
        if (item.id !== event.data?.id) return item;

        const priceValue = event.newValue as number | null;
        const finalPrice = calculateFinalPrice(item.basePrice, item.priceType, priceValue);

        return {
          ...item,
          priceValue,
          finalPrice,
          // Clear templateId when value is manually changed
          templateId: undefined,
        };
      });
      onItemsChange(newItems);
    },
    [items, onItemsChange]
  );

  const handleDelete = useCallback(
    (itemId: string) => {
      onItemsChange(items.filter((item) => item.id !== itemId));
    },
    [items, onItemsChange]
  );

  const handleDuplicate = useCallback(
    (itemId: string) => {
      const itemToDuplicate = items.find((item) => item.id === itemId);
      if (!itemToDuplicate) return;

      const newItem: IComponentItem = {
        ...itemToDuplicate,
        id: `item-${Date.now()}`,
        sortIndex: items.length,
      };
      onItemsChange([...items, newItem]);
    },
    [items, onItemsChange]
  );

  const handleRowDragEnd = useCallback(
    (event: RowDragEndEvent<IComponentItem>) => {
      const { node, overIndex } = event;
      if (overIndex === undefined || overIndex === null) return;

      const movedItem = node.data;
      if (!movedItem) return;

      const newItems = [...items];
      const oldIndex = newItems.findIndex((item) => item.id === movedItem.id);
      newItems.splice(oldIndex, 1);
      newItems.splice(overIndex, 0, movedItem);

      // Update sort indices
      const reindexed = newItems.map((item, index) => ({
        ...item,
        sortIndex: index,
      }));

      onItemsChange(reindexed);
    },
    [items, onItemsChange]
  );

  // Column definitions
  const columnDefs = useMemo<ColDef<IComponentItem>[]>(
    () => [
      // Checkbox column (only in bulk edit mode)
      ...(bulkEditMode
        ? [
            {
              headerName: "",
              field: "id" as const,
              width: 50,
              suppressMovable: true,
              resizable: false,
              headerComponent: () => (
                <Checkbox
                  checked={selectedIds.size === items.length && items.length > 0}
                  indeterminate={selectedIds.size > 0 && selectedIds.size < items.length}
                  onChange={handleToggleAll}
                />
              ),
              cellRenderer: (params: ICellRendererParams<IComponentItem>) => (
                <CheckboxCellRenderer
                  {...params}
                  selectedIds={selectedIds}
                  onToggle={handleToggleSelection}
                />
              ),
            },
          ]
        : []),
      // Drag handle column (hidden in bulk edit mode)
      ...(!bulkEditMode
        ? [
            {
              headerName: "",
              field: "sortIndex" as const,
              width: 50,
              rowDrag: true,
              suppressMovable: true,
              resizable: false,
              valueFormatter: () => "",
            },
          ]
        : []),
      {
        headerName: "Product",
        field: "productId",
        flex: 2,
        minWidth: 200,
        cellRenderer: (params: ICellRendererParams<IComponentItem>) => (
          <ProductCellRenderer {...params} onEditVariants={onEditVariants} />
        ),
      },
      {
        headerName: "Price Rule",
        field: "priceType",
        width: 180,
        cellRenderer: (params: ICellRendererParams<IComponentItem>) => (
          <PriceRuleCellRenderer
            {...params}
            pricingTemplates={pricingTemplates}
            onPriceRuleChange={handlePriceRuleChange}
          />
        ),
      },
      {
        headerName: "Value",
        field: "priceValue",
        width: 100,
        editable: (params) => {
          const rule = PRICE_RULE_OPTIONS.find((r) => r.value === params.data?.priceType);
          return !!rule?.requiresValue;
        },
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0, precision: 0 },
        valueFormatter: (params) => {
          const rule = PRICE_RULE_OPTIONS.find((r) => r.value === params.data?.priceType);
          if (!rule?.requiresValue) return "—";
          if (params.value == null) return "—";
          return `${params.value}${rule.valueSuffix || ""}`;
        },
      },
      {
        headerName: "",
        field: "id",
        width: 50,
        cellRenderer: (params: ICellRendererParams<IComponentItem>) => (
          <ActionsCellRenderer
            {...params}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onEditVariants={onEditVariants}
          />
        ),
      },
    ],
    [
      bulkEditMode,
      selectedIds,
      items.length,
      handleToggleAll,
      handleToggleSelection,
      handleDelete,
      handleDuplicate,
      onEditVariants,
      pricingTemplates,
      handlePriceRuleChange,
    ]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: false,
      sortable: false,
      suppressMovable: true,
    }),
    []
  );

  const getRowId = useCallback(
    (params: GetRowIdParams<IComponentItem>) => params.data.id,
    []
  );

  return (
    <div>
      <div className={styles.gridWrapper}>
        <AgGridReact<IComponentItem>
          ref={gridRef}
          rowData={items}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={getRowId}
          rowDragManaged={!bulkEditMode}
          animateRows
          domLayout="autoHeight"
          rowHeight={52}
          headerHeight={36}
          onRowDragEnd={handleRowDragEnd}
          onCellValueChanged={handleCellValueChanged}
        />
      </div>
    </div>
  );
};

export default ComponentsTable;
