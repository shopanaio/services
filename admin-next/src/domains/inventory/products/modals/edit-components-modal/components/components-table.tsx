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

import {
  ComponentItemType,
  ComponentPriceType,
  PRICE_RULE_OPTIONS,
  type IComponentItem,
  type IPricingRuleTemplate,
} from "../types";
import {
  getProductById,
  getVariantById,
  calculateFinalPrice,
} from "../mocks/mock-data";

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
  items: IComponentItem[];
  onItemsChange: (items: IComponentItem[]) => void;
  onEditVariants?: (item: IComponentItem) => void;
  onIncludeVariants?: (item: IComponentItem) => void;
  pricingTemplates: IPricingRuleTemplate[];
}

// Row type - either product or variant
interface ITableRow {
  id: string;
  isVariant: boolean;
  level: number; // 0 = product, 1 = variant
  // Product-level fields
  productId: string;
  variantId?: string;
  itemType: ComponentItemType;
  customTitle?: string | null;
  isAvailable: boolean;
  // For products with variants
  hasIncludedVariants: boolean;
  includedVariantsCount: number;
  // Pricing
  priceType: ComponentPriceType;
  priceValue: number | null;
  templateId?: string;
  basePrice: number;
  finalPrice: number;
  // For drag
  sortIndex: number;
  // Parent reference for variants
  parentItemId?: string;
}

// ============================================================================
// Cell Renderers
// ============================================================================

type IProductCellRendererParams = ICellRendererParams<ITableRow>;

const ProductCellRenderer = (params: IProductCellRendererParams) => {
  const { styles, cx } = useStyles();
  const data = params.data;
  if (!data) return null;

  const product = getProductById(data.productId);
  const variant =
    data.variantId && product
      ? getVariantById(data.productId, data.variantId)
      : null;

  const isIncludedVariant = data.isVariant;
  const imageUrl = variant?.imageUrl || product?.imageUrl || "/placeholder.png";

  // For included variants: show Product title + Variant title (like inventory page table)
  if (isIncludedVariant) {
    const productTitle = product?.title || "Unknown";
    const variantTitle = variant?.title || "Unknown";

    return (
      <div
        className={cx(
          styles.productCell,
          !data.isAvailable && styles.unavailable
        )}
      >
        <img
          src={imageUrl || "/placeholder.png"}
          className={styles.productImage}
          alt=""
        />
        <div className={styles.productInfo}>
          <span className={styles.productTitle}>{productTitle}</span>
          <span className={styles.variantTitle}>{variantTitle}</span>
        </div>
      </div>
    );
  }

  // For regular products/variants (not included variants)
  const title =
    data.customTitle || variant?.title || product?.title || "Unknown";

  // Show variant count for products with variants
  const variantsCount =
    data.itemType === ComponentItemType.PRODUCT_WITH_VARIANTS
      ? product?.variants?.length ?? 0
      : 0;

  return (
    <div
      className={cx(
        styles.productCell,
        !data.isAvailable && styles.unavailable
      )}
    >
      <img
        src={imageUrl || "/placeholder.png"}
        className={styles.productImage}
        alt=""
      />
      <div className={styles.productInfo}>
        <span className={styles.productTitle}>{title}</span>
        {variantsCount > 0 && (
          <span className={styles.variantsCount}>
            {variantsCount} variant{variantsCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Price Rule Cell Renderer
// ============================================================================

interface IPriceRuleCellRendererProps extends ICellRendererParams<ITableRow> {
  pricingTemplates: IPricingRuleTemplate[];
  onPriceRuleChange: (
    rowId: string,
    isVariant: boolean,
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

  const options = [
    ...(pricingTemplates.length > 0
      ? [
          {
            label: "Templates",
            options: pricingTemplates.map((tpl) => {
              const rule = PRICE_RULE_OPTIONS.find(
                (r) => r.value === tpl.priceType
              );
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
    {
      label: "Custom",
      options: PRICE_RULE_OPTIONS.map((opt) => ({
        label: opt.label,
        value: opt.value,
      })),
    },
  ];

  const currentValue = data.templateId
    ? `${TEMPLATE_PREFIX}${data.templateId}`
    : data.priceType;

  const handleChange = (value: string) => {
    if (value.startsWith(TEMPLATE_PREFIX)) {
      const templateId = value.replace(TEMPLATE_PREFIX, "");
      const template = pricingTemplates.find((t) => t.id === templateId);
      if (template) {
        onPriceRuleChange(
          data.id,
          data.isVariant,
          template.priceType,
          template.priceValue,
          templateId
        );
      }
    } else {
      const priceType = value as ComponentPriceType;
      const rule = PRICE_RULE_OPTIONS.find((r) => r.value === priceType);
      const priceValue = rule?.requiresValue ? data.priceValue ?? 0 : null;
      onPriceRuleChange(
        data.id,
        data.isVariant,
        priceType,
        priceValue,
        undefined
      );
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
  onDelete: (rowId: string, isVariant: boolean) => void;
  onDeleteAllVariants: (parentItemId: string) => void;
  onDuplicate: (rowId: string) => void;
  onEditVariants?: (item: IComponentItem) => void;
  onIncludeVariants?: (item: IComponentItem) => void;
  items: IComponentItem[];
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

  if (data.isVariant) {
    const menuItems: MenuProps["items"] = [
      {
        key: "delete",
        icon: <DeleteOutlined />,
        label: "Remove",
        danger: true,
        onClick: () => onDelete(data.id, true),
      },
      ...(data.parentItemId
        ? [
            {
              key: "delete-all",
              icon: <DeleteOutlined />,
              label: "Remove all",
              danger: true,
              onClick: () => onDeleteAllVariants(data.parentItemId!),
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

  const fullItem = items.find((item) => item.id === data.id);

  const menuItems: MenuProps["items"] = [
    {
      key: "duplicate",
      icon: <CopyOutlined />,
      label: "Duplicate",
      onClick: () => onDuplicate(data.id),
    },
    ...(data.itemType === ComponentItemType.PRODUCT_WITH_VARIANTS && fullItem
      ? [
          ...(onEditVariants
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
          ...(onIncludeVariants
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
        ]
      : []),
    { type: "divider" as const },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Delete",
      danger: true,
      onClick: () => onDelete(data.id, false),
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
  const gridRef = useRef<AgGridReact<ITableRow>>(null);

  // Refs for drag handling
  const draggingRowIdRef = useRef<string | null>(null);

  // Build all rows (products + variants) and sort by sortIndex
  // When a product has included variants, only show the variants (not the product row)
  // All rows are sortable independently
  const allRows = useMemo<ITableRow[]>(() => {
    const rows: ITableRow[] = [];

    items.forEach((item) => {
      const hasIncludedVariants = !!(
        item.includedVariants && item.includedVariants.length > 0
      );

      // If item has included variants, only show the variants (skip the product row)
      if (hasIncludedVariants && item.includedVariants) {
        item.includedVariants.forEach((variant) => {
          rows.push({
            id: variant.id,
            isVariant: true,
            level: 0,
            productId: item.productId,
            variantId: variant.variantId,
            itemType: ComponentItemType.SINGLE_VARIANT,
            isAvailable: item.isAvailable,
            hasIncludedVariants: false,
            includedVariantsCount: 0,
            priceType: variant.priceType,
            priceValue: variant.priceValue,
            templateId: variant.templateId,
            basePrice: variant.basePrice,
            finalPrice: variant.finalPrice,
            sortIndex: variant.sortIndex,
            parentItemId: item.id,
          });
        });
      } else {
        // Regular product/variant without included variants
        rows.push({
          id: item.id,
          isVariant: false,
          level: 0,
          productId: item.productId,
          variantId: item.variantId,
          itemType: item.itemType,
          customTitle: item.customTitle,
          isAvailable: item.isAvailable,
          hasIncludedVariants: false,
          includedVariantsCount: 0,
          priceType: item.priceType,
          priceValue: item.priceValue,
          templateId: item.templateId,
          basePrice: item.basePrice,
          finalPrice: item.finalPrice,
          sortIndex: item.sortIndex,
        });
      }
    });

    // Sort all rows by sortIndex for global ordering
    return rows.sort((a, b) => a.sortIndex - b.sortIndex);
  }, [items]);

  // All rows are visible (no expand/collapse filtering needed)
  const visibleRows = allRows;

  const handlePriceRuleChange = useCallback(
    (
      rowId: string,
      isVariant: boolean,
      priceType: ComponentPriceType,
      priceValue: number | null,
      templateId?: string
    ) => {
      if (isVariant) {
        const newItems = items.map((item) => {
          if (!item.includedVariants) return item;

          const variantIndex = item.includedVariants.findIndex(
            (v) => v.id === rowId
          );
          if (variantIndex === -1) return item;

          const updatedVariants = [...item.includedVariants];
          const variant = updatedVariants[variantIndex];
          const finalPrice = calculateFinalPrice(
            variant.basePrice,
            priceType,
            priceValue
          );

          updatedVariants[variantIndex] = {
            ...variant,
            priceType,
            priceValue,
            templateId,
            finalPrice,
          };

          return { ...item, includedVariants: updatedVariants };
        });
        onItemsChange(newItems);
      } else {
        const newItems = items.map((item) => {
          if (item.id !== rowId) return item;

          const finalPrice = calculateFinalPrice(
            item.basePrice,
            priceType,
            priceValue
          );

          return {
            ...item,
            priceType,
            priceValue,
            templateId,
            finalPrice,
          };
        });
        onItemsChange(newItems);
      }
    },
    [items, onItemsChange]
  );

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<ITableRow>) => {
      const field = event.colDef?.field;
      if (!event.data || field !== "priceValue") return;

      const rowId = event.data.id;
      const isVariant = event.data.isVariant;
      const newPriceValue = event.newValue as number | null;

      if (isVariant) {
        const newItems = items.map((item) => {
          if (!item.includedVariants) return item;

          const variantIndex = item.includedVariants.findIndex(
            (v) => v.id === rowId
          );
          if (variantIndex === -1) return item;

          const updatedVariants = [...item.includedVariants];
          const variant = updatedVariants[variantIndex];
          const finalPrice = calculateFinalPrice(
            variant.basePrice,
            variant.priceType,
            newPriceValue
          );

          updatedVariants[variantIndex] = {
            ...variant,
            priceValue: newPriceValue,
            finalPrice,
            templateId: undefined,
          };

          return { ...item, includedVariants: updatedVariants };
        });
        onItemsChange(newItems);
      } else {
        const newItems = items.map((item) => {
          if (item.id !== rowId) return item;

          const finalPrice = calculateFinalPrice(
            item.basePrice,
            item.priceType,
            newPriceValue
          );

          return {
            ...item,
            priceValue: newPriceValue,
            finalPrice,
            templateId: undefined,
          };
        });
        onItemsChange(newItems);
      }
    },
    [items, onItemsChange]
  );

  const handleDelete = useCallback(
    (rowId: string, isVariant: boolean) => {
      if (isVariant) {
        const newItems = items.map((item) => {
          if (!item.includedVariants) return item;

          const newVariants = item.includedVariants.filter(
            (v) => v.id !== rowId
          );
          return {
            ...item,
            includedVariants: newVariants.length > 0 ? newVariants : undefined,
          };
        });
        onItemsChange(newItems);
      } else {
        onItemsChange(items.filter((item) => item.id !== rowId));
      }
    },
    [items, onItemsChange]
  );

  const handleDeleteAllVariants = useCallback(
    (parentItemId: string) => {
      const newItems = items.map((item) => {
        if (item.id !== parentItemId) return item;
        return {
          ...item,
          includedVariants: undefined,
        };
      });
      onItemsChange(newItems);
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
        includedVariants: itemToDuplicate.includedVariants?.map((v) => ({
          ...v,
          id: `variant-${Date.now()}-${v.variantId}`,
        })),
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

  const handleRowDragEnd = useCallback(
    (event: RowDragEndEvent<ITableRow>) => {
      draggingRowIdRef.current = null;

      const { node, overIndex } = event;
      const movingData = node?.data;

      if (!movingData) {
        return;
      }

      if (overIndex === undefined || overIndex === null) {
        return;
      }

      // Get the new order of all rows from the grid
      const newOrderedRows: {
        id: string;
        isVariant: boolean;
        parentItemId?: string;
      }[] = [];
      event.api.forEachNodeAfterFilterAndSort((rowNode) => {
        if (rowNode.data) {
          newOrderedRows.push({
            id: rowNode.data.id,
            isVariant: rowNode.data.isVariant,
            parentItemId: rowNode.data.parentItemId,
          });
        }
      });

      // Build a map of new sortIndex for each row
      const sortIndexMap = new Map<string, number>();
      newOrderedRows.forEach((row, index) => {
        sortIndexMap.set(row.id, index);
      });

      // Update items with new sortIndex values
      const newItems = items.map((item) => {
        const hasIncludedVariants = !!(
          item.includedVariants && item.includedVariants.length > 0
        );

        if (hasIncludedVariants && item.includedVariants) {
          // Update sortIndex for each included variant
          const updatedVariants = item.includedVariants.map((variant) => ({
            ...variant,
            sortIndex: sortIndexMap.get(variant.id) ?? variant.sortIndex,
          }));
          return { ...item, includedVariants: updatedVariants };
        } else {
          // Update sortIndex for regular items
          const newSortIndex = sortIndexMap.get(item.id);
          if (newSortIndex !== undefined) {
            return { ...item, sortIndex: newSortIndex };
          }
          return item;
        }
      });

      onItemsChange(newItems);
    },
    [items, onItemsChange]
  );

  const getRowClass = useCallback((params: { data: ITableRow | undefined }) => {
    if (params.data?.isVariant) return "row-variant";
    return "";
  }, []);

  const columnDefs = useMemo<ColDef<ITableRow>[]>(
    () => [
      {
        headerName: "",
        field: "sortIndex" as const,
        width: 50,
        rowDrag: true,
        suppressMovable: true,
        resizable: false,
        valueFormatter: () => "",
      },
      {
        headerName: "Product",
        field: "productId",
        flex: 2,
        minWidth: 200,
        cellRenderer: ProductCellRenderer,
      },
      {
        headerName: "Price Rule",
        field: "priceType",
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
        field: "priceValue",
        width: 100,
        editable: (params) => {
          const rule = PRICE_RULE_OPTIONS.find(
            (r) => r.value === params.data?.priceType
          );
          return !!rule?.requiresValue;
        },
        cellRenderer: (params: ICellRendererParams<ITableRow>) => {
          const rule = PRICE_RULE_OPTIONS.find(
            (r) => r.value === params.data?.priceType
          );
          if (!rule?.requiresValue) return "—";
          if (params.value == null) return "—";
          return `${params.value}${rule.valueSuffix || ""}`;
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
            const product = getProductById(data.productId);
            return data.customTitle || product?.title || "";
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
