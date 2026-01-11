"use client";

import { useMemo, useCallback, useRef } from "react";
import { createStyles } from "antd-style";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  GetRowIdParams,
  ICellRendererParams,
  RowDragEndEvent,
  RowDragEnterEvent,
  CellValueChangedEvent,
} from "ag-grid-community";
import { Button, Dropdown, Select } from "antd";
import {
  MoreOutlined,
  DeleteOutlined,
  CopyOutlined,
  PlusOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";

import type { ComponentItem, PricingRuleTemplate } from "../types";
import {
  ComponentItemType,
  ComponentPriceType,
  PRICE_RULE_OPTIONS,
} from "../types";
import type { ApiProduct, ApiVariant, ApiFile } from "@/graphql/types";
import { useAgGridTheme } from "@/hooks";

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
    "& .row-variant": {
      background: `${token.colorFillQuaternary} !important`,
    },
    // Transparent resize handles (visible on hover), full height
    "& .ag-header-cell-resize": {
      opacity: 0,
      transition: "opacity 0.2s",
      height: "100%",
      top: 0,
      "&:hover": {
        opacity: 1,
      },
    },
  },
  productCell: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
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
    minWidth: 0,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.3,
  },
  variantTitle: {
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.3,
    color: token.colorTextSecondary,
  },
  variantsCount: {
    fontSize: 11,
    color: token.colorTextTertiary,
  },
  unavailable: {
    opacity: 0.5,
  },
}));

// ============================================================================
// Types
// ============================================================================

interface IComponentsTableProps {
  items: ComponentItem[];
  onItemsChange: (items: ComponentItem[]) => void;
  onEditVariants?: (item: ComponentItem) => void;
  onIncludeVariants?: (item: ComponentItem) => void;
  pricingTemplates: PricingRuleTemplate[];
}

// Row type - either product or variant
interface ITableRow {
  id: string;
  itemType: ComponentItemType;

  // For PRODUCT
  assignedProduct?: ApiProduct;
  excludeAssignedProductVariants?: string[] | null;

  // For VARIANT
  assignedVariant?: ApiVariant;

  // Pricing
  pricingRule:
    | {
        priceType: ComponentPriceType;
        priceValue: number | null;
      }
    | PricingRuleTemplate;

  // Overrides
  overrides: {
    title: string | null;
    featuredImage: ApiFile | null;
  };

  sortIndex: number;
}

// ============================================================================
// Helpers
// ============================================================================

// Helper to determine if pricingRule is a template
const isTemplate = (
  rule: ComponentItem["pricingRule"]
): rule is PricingRuleTemplate => {
  return "id" in rule && "name" in rule;
};

// ============================================================================
// Cell Renderers
// ============================================================================

type IProductCellRendererParams = ICellRendererParams<ITableRow>;

// Helper to get image URL from variant or product
const getVariantImageUrl = (variant?: ApiVariant): string | null => {
  if (!variant) return null;
  const mediaItem = variant.media?.[0];
  return mediaItem?.file?.url ?? null;
};

const ProductCellRenderer = (params: IProductCellRendererParams) => {
  const { styles } = useStyles();
  const data = params.data;
  if (!data) return null;

  if (data.itemType === ComponentItemType.VARIANT) {
    // For variant: show variant title (and optionally product title if available)
    const variant = data.assignedVariant;
    const productTitle = variant?.product?.title;
    const variantTitle = data.overrides.title || variant?.title || variant?.sku || "Unknown Variant";
    const imageUrl = getVariantImageUrl(variant);

    return (
      <div className={styles.productCell}>
        <img
          src={imageUrl || "/placeholder.png"}
          className={styles.productImage}
          alt=""
        />
        <div className={styles.productInfo}>
          {productTitle ? (
            <>
              <span className={styles.productTitle}>{productTitle}</span>
              <span className={styles.variantTitle}>{variantTitle}</span>
            </>
          ) : (
            <span className={styles.productTitle}>{variantTitle}</span>
          )}
        </div>
      </div>
    );
  }

  // For product - no direct media on ApiProduct, use placeholder
  const product = data.assignedProduct;
  const title = data.overrides.title || product?.title || "Unknown";

  return (
    <div className={styles.productCell}>
      <img
        src="/placeholder.png"
        className={styles.productImage}
        alt=""
      />
      <div className={styles.productInfo}>
        <span className={styles.productTitle}>{title}</span>
      </div>
    </div>
  );
};

// ============================================================================
// Price Rule Cell Renderer
// ============================================================================

interface IPriceRuleCellRendererProps extends ICellRendererParams<ITableRow> {
  pricingTemplates: PricingRuleTemplate[];
  onPriceRuleChange: (itemId: string, pricingRule: ComponentItem["pricingRule"]) => void;
}

const TEMPLATE_PREFIX = "tpl:";

const PriceRuleCellRenderer = ({
  data,
  pricingTemplates,
  onPriceRuleChange,
}: IPriceRuleCellRendererProps) => {
  if (!data) return null;

  const { pricingRule } = data;

  // Determine current value for Select
  const currentValue = isTemplate(pricingRule)
    ? `${TEMPLATE_PREFIX}${pricingRule.id}` // template
    : pricingRule.priceType; // custom rule

  // Options: Templates + Custom rules
  const options = [
    ...(pricingTemplates.length > 0
      ? [
          {
            label: "Templates",
            options: pricingTemplates.map((tpl) => ({
              label: tpl.name,
              value: `${TEMPLATE_PREFIX}${tpl.id}`,
            })),
          },
        ]
      : []),
    {
      label: "Custom",
      options: PRICE_RULE_OPTIONS.map((opt) => ({
        label: opt.label,
        value: opt.value,
      })),
    },
  ];

  const handleChange = (value: string) => {
    if (value.startsWith(TEMPLATE_PREFIX)) {
      // Template selected - save the whole template object
      const templateId = value.replace(TEMPLATE_PREFIX, "");
      const template = pricingTemplates.find((t) => t.id === templateId);
      if (template) {
        onPriceRuleChange(data.id, template);
      }
    } else {
      // Custom rule selected - save inline object
      const priceType = value as ComponentPriceType;
      const rule = PRICE_RULE_OPTIONS.find((r) => r.value === priceType);

      // Preserve priceValue if previous rule had same type
      const prevValue = isTemplate(pricingRule)
        ? pricingRule.priceValue
        : pricingRule.priceValue;

      onPriceRuleChange(data.id, {
        priceType,
        priceValue: rule?.requiresValue ? (prevValue ?? 0) : null,
      });
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

interface IActionsCellRendererProps extends ICellRendererParams<ITableRow> {
  onDelete: (itemId: string) => void;
  onDeleteAllVariants: (productId: string) => void;
  onDuplicate: (itemId: string) => void;
  onEditVariants?: (item: ComponentItem) => void;
  onIncludeVariants?: (item: ComponentItem) => void;
  items: ComponentItem[];
}

const ActionsCellRenderer = ({
  data,
  onDelete,
  onDeleteAllVariants,
  onDuplicate,
  onEditVariants,
  onIncludeVariants,
  items,
}: IActionsCellRendererProps) => {
  if (!data) return null;

  // For VARIANT
  if (data.itemType === ComponentItemType.VARIANT) {
    const productId = data.assignedVariant?.product?.id;
    const menuItems: MenuProps["items"] = [
      {
        key: "delete",
        icon: <DeleteOutlined />,
        label: "Remove",
        danger: true,
        onClick: () => onDelete(data.id),
      },
      ...(productId
        ? [
            {
              key: "delete-all",
              icon: <DeleteOutlined />,
              label: "Remove all variants",
              danger: true,
              onClick: () => onDeleteAllVariants(productId),
            },
          ]
        : []),
    ];

    return (
      <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
        <Button type="text" size="small" icon={<MoreOutlined />} />
      </Dropdown>
    );
  }

  // For PRODUCT
  const fullItem = items.find((item) => item.id === data.id);

  const menuItems: MenuProps["items"] = [
    {
      key: "duplicate",
      icon: <CopyOutlined />,
      label: "Duplicate",
      onClick: () => onDuplicate(data.id),
    },
    ...(fullItem && onEditVariants
      ? [
          {
            key: "edit-variants",
            icon: <SettingOutlined />,
            label: "Edit variants",
            onClick: () => {
              onEditVariants(fullItem);
            },
          },
        ]
      : []),
    ...(fullItem && onIncludeVariants
      ? [
          {
            key: "include-variants",
            icon: <PlusOutlined />,
            label: "Show as variants",
            onClick: () => {
              onIncludeVariants(fullItem);
            },
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
  onIncludeVariants,
  pricingTemplates,
}: IComponentsTableProps) => {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ITableRow>>(null);

  // Refs for drag handling
  const draggingRowIdRef = useRef<string | null>(null);

  // Build all rows - simplified flat structure
  const allRows = useMemo<ITableRow[]>(() => {
    return items
      .map(
        (item): ITableRow => ({
          id: item.id,
          itemType: item.itemType,
          assignedProduct: item.assignedProduct,
          assignedVariant: item.assignedVariant,
          excludeAssignedProductVariants: item.excludeAssignedProductVariants,
          pricingRule: item.pricingRule,
          overrides: item.overrides,
          sortIndex: item.sortIndex,
        })
      )
      .sort((a, b) => a.sortIndex - b.sortIndex);
  }, [items]);

  // All rows are visible (no expand/collapse filtering needed)
  const visibleRows = allRows;

  // Handle price rule change
  const handlePriceRuleChange = useCallback(
    (itemId: string, pricingRule: ComponentItem["pricingRule"]) => {
      const newItems = items.map((item) => {
        if (item.id !== itemId) return item;
        return { ...item, pricingRule };
      });
      onItemsChange(newItems);
    },
    [items, onItemsChange]
  );

  // Handle cell value changed (for inline editing of priceValue)
  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<ITableRow>) => {
      if (!event.data) return;

      const rowId = event.data.id;
      const newPriceValue = event.newValue as number | null;

      const newItems = items.map((item) => {
        if (item.id !== rowId) return item;

        const rule = item.pricingRule;
        const priceType = isTemplate(rule) ? rule.priceType : rule.priceType;

        // Convert template to inline rule when editing value
        return {
          ...item,
          pricingRule: {
            priceType,
            priceValue: newPriceValue,
          },
        };
      });
      onItemsChange(newItems);
    },
    [items, onItemsChange]
  );

  // Delete item - simplified
  const handleDelete = useCallback(
    (itemId: string) => {
      onItemsChange(items.filter((item) => item.id !== itemId));
    },
    [items, onItemsChange]
  );

  // Delete all variants of a product
  const handleDeleteAllVariants = useCallback(
    (productId: string) => {
      const newItems = items.filter((item) => {
        if (item.itemType !== ComponentItemType.VARIANT) return true;
        return item.assignedVariant?.product?.id !== productId;
      });
      onItemsChange(newItems);
    },
    [items, onItemsChange]
  );

  // Duplicate item
  const handleDuplicate = useCallback(
    (itemId: string) => {
      const itemToDuplicate = items.find((item) => item.id === itemId);
      if (!itemToDuplicate) return;

      const newItem: ComponentItem = {
        ...itemToDuplicate,
        id: `item-${Date.now()}`,
        sortIndex: items.length,
      };
      onItemsChange([...items, newItem]);
    },
    [items, onItemsChange]
  );

  // Handle row drag enter
  const handleRowDragEnter = useCallback(
    (event: RowDragEnterEvent<ITableRow>) => {
      const movingData = event.node?.data;
      if (!movingData) return;

      // Prevent multiple triggers for same drag
      if (draggingRowIdRef.current === movingData.id) return;

      draggingRowIdRef.current = movingData.id;
    },
    []
  );

  // Handle row drag end
  const handleRowDragEnd = useCallback(
    (event: RowDragEndEvent<ITableRow>) => {
      draggingRowIdRef.current = null;

      const { node, overIndex } = event;
      const movingData = node?.data;

      if (!movingData) return;
      if (overIndex === undefined || overIndex === null) return;

      // Get the new order of all rows from the grid
      const newOrderedIds: string[] = [];
      event.api.forEachNodeAfterFilterAndSort((rowNode) => {
        if (rowNode.data) {
          newOrderedIds.push(rowNode.data.id);
        }
      });

      // Build a map of new sortIndex for each row
      const sortIndexMap = new Map<string, number>();
      newOrderedIds.forEach((id, index) => {
        sortIndexMap.set(id, index);
      });

      // Update items with new sortIndex values
      const newItems = items.map((item) => {
        const newSortIndex = sortIndexMap.get(item.id);
        if (newSortIndex !== undefined) {
          return { ...item, sortIndex: newSortIndex };
        }
        return item;
      });

      onItemsChange(newItems);
    },
    [items, onItemsChange]
  );

  // Row class for variants
  const getRowClass = useCallback((params: { data: ITableRow | undefined }) => {
    if (params.data?.itemType === ComponentItemType.VARIANT)
      return "row-variant";
    return "";
  }, []);

  // Column definitions
  const columnDefs = useMemo<ColDef<ITableRow>[]>(
    () => [
      {
        headerName: "",
        field: "sortIndex",
        width: 50,
        rowDrag: true,
        suppressMovable: true,
        resizable: false,
        valueFormatter: () => "",
      },
      {
        headerName: "Product",
        field: "id",
        flex: 2,
        minWidth: 200,
        cellRenderer: ProductCellRenderer,
      },
      {
        headerName: "Price Rule",
        field: "pricingRule",
        width: 180,
        cellRenderer: (params: ICellRendererParams<ITableRow>) => (
          <PriceRuleCellRenderer
            {...params}
            pricingTemplates={pricingTemplates}
            onPriceRuleChange={handlePriceRuleChange}
          />
        ),
      },
      {
        headerName: "Value",
        field: "pricingRule",
        width: 100,
        editable: (params) => {
          const rule = params.data?.pricingRule;
          if (!rule) return false;
          const priceType = isTemplate(rule) ? rule.priceType : rule.priceType;
          const option = PRICE_RULE_OPTIONS.find((r) => r.value === priceType);
          return !!option?.requiresValue;
        },
        valueGetter: (params) => {
          const rule = params.data?.pricingRule;
          if (!rule) return null;
          return isTemplate(rule) ? rule.priceValue : rule.priceValue;
        },
        valueSetter: (params) => {
          // Value will be handled by onCellValueChanged
          return true;
        },
        cellRenderer: (params: ICellRendererParams<ITableRow>) => {
          const rule = params.data?.pricingRule;
          if (!rule) return "—";

          const priceType = isTemplate(rule) ? rule.priceType : rule.priceType;
          const priceValue = isTemplate(rule) ? rule.priceValue : rule.priceValue;
          const option = PRICE_RULE_OPTIONS.find((r) => r.value === priceType);

          if (!option?.requiresValue) return "—";
          if (priceValue == null) return "—";
          return `${priceValue}${option.valueSuffix || ""}`;
        },
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0, precision: 0 },
      },
      {
        headerName: "",
        field: "id",
        width: 50,
        cellRenderer: (params: ICellRendererParams<ITableRow>) => (
          <ActionsCellRenderer
            {...params}
            onDelete={handleDelete}
            onDeleteAllVariants={handleDeleteAllVariants}
            onDuplicate={handleDuplicate}
            onEditVariants={onEditVariants}
            onIncludeVariants={onIncludeVariants}
            items={items}
          />
        ),
      },
    ],
    [
      items,
      handleDelete,
      handleDeleteAllVariants,
      handleDuplicate,
      onEditVariants,
      onIncludeVariants,
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
    (params: GetRowIdParams<ITableRow>) => params.data.id,
    []
  );

  return (
    <div>
      <div className={styles.gridWrapper}>
        <AgGridReact<ITableRow>
          ref={gridRef}
          theme={agGridTheme}
          rowData={visibleRows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={getRowId}
          getRowClass={getRowClass}
          rowDragManaged
          animateRows
          suppressMovableColumns
          domLayout="autoHeight"
          rowHeight={52}
          headerHeight={36}
          rowDragText={(params) => {
            const data = params.rowNode?.data;
            if (!data) return "";
            if (data.itemType === ComponentItemType.VARIANT) {
              return data.assignedVariant?.title || "";
            }
            return data.overrides.title || data.assignedProduct?.title || "";
          }}
          onRowDragEnter={handleRowDragEnter}
          onRowDragEnd={handleRowDragEnd}
          onCellValueChanged={handleCellValueChanged}
        />
      </div>
    </div>
  );
};

export default ComponentsTable;
