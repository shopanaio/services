"use client";

import { useMemo, useCallback, useRef, useState, useEffect } from "react";
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
import { Button, Dropdown, Select, Checkbox } from "antd";
import {
  MoreOutlined,
  DeleteOutlined,
  CopyOutlined,
  PlusOutlined,
  RightOutlined,
  DownOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";

import {
  ComponentItemType,
  ComponentPriceType,
  PRICE_RULE_OPTIONS,
  type IComponentItem,
  type IPricingRuleTemplate,
} from "../types";
import { getProductById, getVariantById, calculateFinalPrice } from "../mocks/mock-data";
import { Dash } from "@/shared/components/editor-grid";

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
    "& .row-container": {
      "& .ag-cell[col-id='priceType'], & .ag-cell[col-id='priceValue']": {
        backgroundColor: token.colorFillQuaternary,
      },
    },
    "& .ec-dash": {
      display: "inline-block",
      width: 24,
      height: 4,
      backgroundColor: token.colorBorder,
      borderRadius: 2,
      verticalAlign: "middle",
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
  expandIcon: {
    cursor: "pointer",
    fontSize: 10,
    color: token.colorTextSecondary,
    width: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    "&:hover": {
      color: token.colorText,
    },
  },
  expandIconPlaceholder: {
    width: 16,
    flexShrink: 0,
  },
  productImage: {
    width: 36,
    height: 36,
    borderRadius: 4,
    objectFit: "cover",
    background: token.colorBgLayout,
    flexShrink: 0,
  },
  variantImage: {
    width: 28,
    height: 28,
    borderRadius: 3,
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
  indent: {
    display: "inline-block",
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
  bulkEditMode: boolean;
  onSelectionChange: (selectedIds: Set<string>) => void;
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

interface IProductCellRendererParams extends ICellRendererParams<ITableRow> {
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}

const ProductCellRenderer = (params: IProductCellRendererParams) => {
  const { styles, cx } = useStyles();
  const data = params.data;
  if (!data) return null;

  const { expandedIds, onToggleExpand } = params;

  const product = getProductById(data.productId);
  const variant =
    data.variantId && product
      ? getVariantById(data.productId, data.variantId)
      : null;

  const isVariant = data.isVariant;
  const title = data.customTitle || variant?.title || product?.title || "Unknown";
  const imageUrl = variant?.imageUrl || product?.imageUrl || "/placeholder.png";

  const hasChildren = data.hasIncludedVariants;
  const isExpanded = expandedIds.has(data.id);
  const indent = data.level * 24;

  return (
    <div className={cx(styles.productCell, !data.isAvailable && styles.unavailable)}>
      <span className={styles.indent} style={{ width: indent }} />

      {hasChildren ? (
        <span
          className={styles.expandIcon}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(data.id);
          }}
        >
          {isExpanded ? <DownOutlined /> : <RightOutlined />}
        </span>
      ) : (
        <span className={styles.expandIconPlaceholder} />
      )}

      <img
        src={imageUrl || "/placeholder.png"}
        className={isVariant ? styles.variantImage : styles.productImage}
        alt=""
      />
      <div className={styles.productInfo}>
        <span className={isVariant ? styles.variantTitle : styles.productTitle}>
          {title}
        </span>
        {hasChildren && !isExpanded && (
          <span className={styles.variantsCount}>
            {data.includedVariantsCount} variant{data.includedVariantsCount !== 1 ? 's' : ''} included
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Checkbox Cell Renderer (for bulk edit)
// ============================================================================

interface ICheckboxCellRendererProps extends ICellRendererParams<ITableRow> {
  selectedIds: Set<string>;
  onToggle: (itemId: string) => void;
}

const CheckboxCellRenderer = ({
  data,
  selectedIds,
  onToggle,
}: ICheckboxCellRendererProps) => {
  if (!data || data.isVariant) return null;

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

  // Container products (with included variants) don't have their own price settings
  if (data.hasIncludedVariants && !data.isVariant) {
    return <Dash />;
  }

  const options = [
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
        onPriceRuleChange(data.id, data.isVariant, template.priceType, template.priceValue, templateId);
      }
    } else {
      const priceType = value as ComponentPriceType;
      const rule = PRICE_RULE_OPTIONS.find((r) => r.value === priceType);
      const priceValue = rule?.requiresValue ? data.priceValue ?? 0 : null;
      onPriceRuleChange(data.id, data.isVariant, priceType, priceValue, undefined);
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
  onDuplicate: (rowId: string) => void;
  onIncludeVariants?: (item: IComponentItem) => void;
  onExpandItem: (id: string) => void;
  items: IComponentItem[];
}

const ActionsCellRenderer = ({
  data,
  onDelete,
  onDuplicate,
  onIncludeVariants,
  onExpandItem,
  items,
}: IActionsCellRendererProps) => {
  if (!data) return null;

  if (data.isVariant) {
    const menuItems: MenuProps["items"] = [
      {
        key: "delete",
        icon: <DeleteOutlined />,
        label: "Remove variant",
        danger: true,
        onClick: () => onDelete(data.id, true),
      },
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
    ...(data.itemType === ComponentItemType.PRODUCT_WITH_VARIANTS && onIncludeVariants && fullItem
      ? [
          {
            key: "include-variants",
            icon: <PlusOutlined />,
            label: "Include variants",
            onClick: () => {
              onIncludeVariants(fullItem);
              // Auto-expand after adding variants
              onExpandItem(data.id);
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
  onIncludeVariants,
  pricingTemplates,
  bulkEditMode,
  onSelectionChange,
}: IComponentsTableProps) => {
  const { styles } = useStyles();
  const gridRef = useRef<AgGridReact<ITableRow>>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  // Refs for drag handling (like in EditAttributesModal)
  const expandedBeforeDragRef = useRef<Set<string> | null>(null);
  const draggingRowIdRef = useRef<string | null>(null);

  // Refs to avoid stale closures in drag handlers
  const expandedIdsRef = useRef(expandedIds);
  useEffect(() => {
    expandedIdsRef.current = expandedIds;
  }, [expandedIds]);

  const updateSelection = useCallback(
    (newSelectedIds: Set<string>) => {
      setSelectedIds(newSelectedIds);
      onSelectionChange(newSelectedIds);
    },
    [onSelectionChange]
  );

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

  const handleToggleAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      updateSelection(new Set());
    } else {
      updateSelection(new Set(items.map((item) => item.id)));
    }
  }, [items, selectedIds.size, updateSelection]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Expand only (never collapse) - used after adding variants
  const handleExpandItem = useCallback((id: string) => {
    setExpandedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // Build all rows (products + variants)
  const allRows = useMemo<ITableRow[]>(() => {
    const rows: ITableRow[] = [];

    items.forEach((item) => {
      const hasIncludedVariants = !!(item.includedVariants && item.includedVariants.length > 0);

      rows.push({
        id: item.id,
        isVariant: false,
        level: 0,
        productId: item.productId,
        variantId: item.variantId,
        itemType: item.itemType,
        customTitle: item.customTitle,
        isAvailable: item.isAvailable,
        hasIncludedVariants,
        includedVariantsCount: item.includedVariants?.length ?? 0,
        priceType: item.priceType,
        priceValue: item.priceValue,
        templateId: item.templateId,
        basePrice: item.basePrice,
        finalPrice: item.finalPrice,
        sortIndex: item.sortIndex,
      });

      if (item.includedVariants) {
        item.includedVariants.forEach((variant) => {
          rows.push({
            id: variant.id,
            isVariant: true,
            level: 1,
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
            sortIndex: 0,
            parentItemId: item.id,
          });
        });
      }
    });

    return rows;
  }, [items]);

  // Filter visible rows based on expanded state
  const visibleRows = useMemo(() => {
    return allRows.filter((row) => {
      if (!row.isVariant) return true;
      // Variant is visible only if parent is expanded
      return row.parentItemId && expandedIds.has(row.parentItemId);
    });
  }, [allRows, expandedIds]);

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

          const variantIndex = item.includedVariants.findIndex((v) => v.id === rowId);
          if (variantIndex === -1) return item;

          const updatedVariants = [...item.includedVariants];
          const variant = updatedVariants[variantIndex];
          const finalPrice = calculateFinalPrice(variant.basePrice, priceType, priceValue);

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
        const applyToIds = bulkEditMode && selectedIds.has(rowId)
          ? selectedIds
          : new Set([rowId]);

        const newItems = items.map((item) => {
          if (!applyToIds.has(item.id)) return item;

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
      }
    },
    [items, onItemsChange, bulkEditMode, selectedIds]
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

          const variantIndex = item.includedVariants.findIndex((v) => v.id === rowId);
          if (variantIndex === -1) return item;

          const updatedVariants = [...item.includedVariants];
          const variant = updatedVariants[variantIndex];
          const finalPrice = calculateFinalPrice(variant.basePrice, variant.priceType, newPriceValue);

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
        const applyToIds = bulkEditMode && selectedIds.has(rowId)
          ? selectedIds
          : new Set([rowId]);

        const newItems = items.map((item) => {
          if (!applyToIds.has(item.id)) return item;

          const finalPrice = calculateFinalPrice(item.basePrice, item.priceType, newPriceValue);

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
    [items, onItemsChange, bulkEditMode, selectedIds]
  );

  const handleDelete = useCallback(
    (rowId: string, isVariant: boolean) => {
      if (isVariant) {
        const newItems = items.map((item) => {
          if (!item.includedVariants) return item;

          const newVariants = item.includedVariants.filter((v) => v.id !== rowId);
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

  // Handle row drag enter - collapse all expanded products when dragging
  const handleRowDragEnter = useCallback((event: RowDragEnterEvent<ITableRow>) => {
    const movingData = event.node?.data;
    if (!movingData || movingData.isVariant) return;

    // Prevent multiple triggers for same drag
    if (draggingRowIdRef.current === movingData.id) return;

    draggingRowIdRef.current = movingData.id;
    expandedBeforeDragRef.current = new Set(expandedIdsRef.current);

    // Collapse all products for easier reordering
    setExpandedIds(new Set());
  }, []);

  const handleRowDragEnd = useCallback(
    (event: RowDragEndEvent<ITableRow>) => {
      const savedExpandedIds = expandedBeforeDragRef.current;
      draggingRowIdRef.current = null;
      expandedBeforeDragRef.current = null;

      const { node, overIndex } = event;
      const movingData = node?.data;

      if (!movingData || movingData.isVariant) {
        // Restore expanded state if invalid drag
        if (savedExpandedIds) setExpandedIds(savedExpandedIds);
        return;
      }

      if (overIndex === undefined || overIndex === null) {
        if (savedExpandedIds) setExpandedIds(savedExpandedIds);
        return;
      }

      // Get the new order from the grid (only top-level products)
      const newOrderedIds: string[] = [];
      event.api.forEachNodeAfterFilterAndSort((rowNode) => {
        if (rowNode.data && !rowNode.data.isVariant) {
          newOrderedIds.push(rowNode.data.id);
        }
      });

      // Rebuild items array in new order
      const itemMap = new Map(items.map((item) => [item.id, item]));
      const reorderedItems = newOrderedIds
        .map((id) => itemMap.get(id))
        .filter((item): item is IComponentItem => item !== undefined)
        .map((item, index) => ({
          ...item,
          sortIndex: index,
        }));

      onItemsChange(reorderedItems);

      // Restore expanded state
      if (savedExpandedIds) {
        setExpandedIds(savedExpandedIds);
      }
    },
    [items, onItemsChange]
  );

  const getRowClass = useCallback((params: { data: ITableRow | undefined }) => {
    if (params.data?.isVariant) return "row-variant";
    if (params.data?.hasIncludedVariants) return "row-container";
    return "";
  }, []);

  const columnDefs = useMemo<ColDef<ITableRow>[]>(
    () => [
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
              cellRenderer: (params: ICellRendererParams<ITableRow>) => (
                <CheckboxCellRenderer
                  {...params}
                  selectedIds={selectedIds}
                  onToggle={handleToggleSelection}
                />
              ),
            },
          ]
        : []),
      ...(!bulkEditMode
        ? [
            {
              headerName: "",
              field: "sortIndex" as const,
              width: 50,
              rowDrag: (params: { data?: ITableRow }) => !params.data?.isVariant,
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
        cellRenderer: ProductCellRenderer,
        cellRendererParams: {
          expandedIds,
          onToggleExpand: handleToggleExpand,
        },
      },
      {
        headerName: "Price Rule",
        field: "priceType",
        width: 180,
        colSpan: (params) => {
          // Container products span across priceType + priceValue columns
          if (params.data?.hasIncludedVariants && !params.data?.isVariant) return 2;
          return 1;
        },
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
          // Container products (with included variants) are not editable
          if (params.data?.hasIncludedVariants && !params.data?.isVariant) return false;
          const rule = PRICE_RULE_OPTIONS.find((r) => r.value === params.data?.priceType);
          return !!rule?.requiresValue;
        },
        cellRenderer: (params: ICellRendererParams<ITableRow>) => {
          const rule = PRICE_RULE_OPTIONS.find((r) => r.value === params.data?.priceType);
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
            onDuplicate={handleDuplicate}
            onIncludeVariants={onIncludeVariants}
            onExpandItem={handleExpandItem}
            items={items}
          />
        ),
      },
    ],
    [
      bulkEditMode,
      selectedIds,
      items,
      expandedIds,
      handleToggleAll,
      handleToggleSelection,
      handleToggleExpand,
      handleExpandItem,
      handleDelete,
      handleDuplicate,
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
          rowDragManaged={!bulkEditMode}
          animateRows
          suppressMovableColumns
          domLayout="autoHeight"
          rowHeight={52}
          headerHeight={36}
          onRowDragEnter={handleRowDragEnter}
          onRowDragEnd={handleRowDragEnd}
          onCellValueChanged={handleCellValueChanged}
        />
      </div>
    </div>
  );
};

export default ComponentsTable;
