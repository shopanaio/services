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
} from "ag-grid-community";
import {
  Select,
  InputNumber,
  Tag,
  Button,
  Dropdown,
} from "antd";
import {
  MoreOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";

import {
  ComponentItemType,
  ComponentPriceType,
  PRICE_RULE_OPTIONS,
  type IComponentItem,
} from "../types";
import { getProductById, getVariantById, formatPrice } from "../mocks/mockData";

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
    "& .ag-row-drag": {
      cursor: "grab",
      marginRight: 0,
    },
    "& .ag-row-dragging": {
      cursor: "grabbing",
    },
    "& .ag-drag-handle": {
      color: token.colorTextQuaternary,
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
    gap: 2,
    minWidth: 0,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  productSku: {
    fontSize: 11,
    color: token.colorTextSecondary,
  },
  variantsBadge: {
    marginLeft: 4,
  },
  priceCell: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  priceMain: {
    fontWeight: 500,
    fontSize: 13,
  },
  priceRange: {
    color: token.colorTextSecondary,
    fontSize: 11,
  },
  priceRuleCell: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  finalPriceCell: {
    fontWeight: 600,
    fontSize: 13,
  },
  finalPriceFree: {
    color: token.colorSuccess,
  },
  finalPriceDiscount: {
    color: token.colorError,
  },
  unavailable: {
    opacity: 0.5,
  },
  stockBadge: {
    fontSize: 11,
  },
}));

// ============================================================================
// Types
// ============================================================================

interface IComponentsTableProps {
  items: IComponentItem[];
  onItemsChange: (items: IComponentItem[]) => void;
  onEditVariants?: (item: IComponentItem) => void;
}

// ============================================================================
// Cell Renderers
// ============================================================================

const ProductCellRenderer = ({ data }: ICellRendererParams<IComponentItem>) => {
  const { styles, cx } = useStyles();
  if (!data) return null;

  const product = getProductById(data.productId);
  const variant =
    data.variantId && product
      ? getVariantById(data.productId, data.variantId)
      : null;

  const title = data.customTitle || variant?.title || product?.title || "Unknown";
  const sku = variant?.sku || product?.sku || "";
  const imageUrl = variant?.imageUrl || product?.imageUrl || "/placeholder.png";

  const variantsCount =
    data.itemType === ComponentItemType.PRODUCT_WITH_VARIANTS
      ? data.availableVariantIds?.length || product?.variants?.length || 0
      : null;

  return (
    <div className={cx(styles.productCell, !data.isAvailable && styles.unavailable)}>
      <img src={imageUrl || "/placeholder.png"} className={styles.productImage} alt="" />
      <div className={styles.productInfo}>
        <span className={styles.productTitle}>
          {title}
          {variantsCount !== null && (
            <Tag color="blue" className={styles.variantsBadge}>
              {variantsCount} var
            </Tag>
          )}
        </span>
        <span className={styles.productSku}>{sku}</span>
      </div>
    </div>
  );
};

const BasePriceCellRenderer = ({ data }: ICellRendererParams<IComponentItem>) => {
  const { styles, cx } = useStyles();
  if (!data) return null;

  const hasRange = data.basePriceMax && data.basePriceMax !== data.basePrice;

  return (
    <div className={cx(styles.priceCell, !data.isAvailable && styles.unavailable)}>
      <span className={styles.priceMain}>{formatPrice(data.basePrice)}</span>
      {hasRange && (
        <span className={styles.priceRange}>- {formatPrice(data.basePriceMax!)}</span>
      )}
    </div>
  );
};

interface IPriceRuleCellRendererProps extends ICellRendererParams<IComponentItem> {
  onPriceTypeChange: (itemId: string, priceType: ComponentPriceType) => void;
  onPriceValueChange: (itemId: string, priceValue: number | null) => void;
}

const PriceRuleCellRenderer = ({
  data,
  onPriceTypeChange,
  onPriceValueChange,
}: IPriceRuleCellRendererProps) => {
  const { styles } = useStyles();
  if (!data) return null;

  const selectedRule = PRICE_RULE_OPTIONS.find((r) => r.value === data.priceType);
  const showValueInput = selectedRule?.requiresValue;

  return (
    <div className={styles.priceRuleCell}>
      <Select
        value={data.priceType}
        onChange={(value) => onPriceTypeChange(data.id, value)}
        options={PRICE_RULE_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
        }))}
        size="small"
        style={{ width: showValueInput ? 110 : "100%" }}
      />
      {showValueInput && (
        <InputNumber
          value={data.priceValue}
          onChange={(value) => onPriceValueChange(data.id, value)}
          size="small"
          style={{ width: 70 }}
          addonAfter={selectedRule?.valueSuffix}
          min={0}
        />
      )}
    </div>
  );
};

const FinalPriceCellRenderer = ({ data }: ICellRendererParams<IComponentItem>) => {
  const { styles, cx } = useStyles();
  if (!data) return null;

  const isFree =
    data.priceType === ComponentPriceType.FREE ||
    data.priceType === ComponentPriceType.INCLUDED;
  const isDiscount =
    data.priceType === ComponentPriceType.DISCOUNT_PERCENT ||
    data.priceType === ComponentPriceType.DISCOUNT_FIXED;

  const hasRange = data.finalPriceMax && data.finalPriceMax !== data.finalPrice;

  if (isFree) {
    return (
      <span className={cx(styles.finalPriceCell, styles.finalPriceFree)}>
        {data.priceType === ComponentPriceType.INCLUDED ? "Included" : "Free"}
      </span>
    );
  }

  return (
    <div className={styles.priceCell}>
      <span
        className={cx(
          styles.finalPriceCell,
          isDiscount && styles.finalPriceDiscount,
          !data.isAvailable && styles.unavailable
        )}
      >
        {formatPrice(data.finalPrice)}
      </span>
      {hasRange && (
        <span className={styles.priceRange}>- {formatPrice(data.finalPriceMax!)}</span>
      )}
    </div>
  );
};

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
}: IComponentsTableProps) => {
  const { styles } = useStyles();
  const gridRef = useRef<AgGridReact<IComponentItem>>(null);

  // Handlers
  const handlePriceTypeChange = useCallback(
    (itemId: string, priceType: ComponentPriceType) => {
      const newItems = items.map((item) => {
        if (item.id !== itemId) return item;

        const rule = PRICE_RULE_OPTIONS.find((r) => r.value === priceType);
        const priceValue = rule?.requiresValue ? item.priceValue ?? 0 : null;

        // Recalculate final price
        let finalPrice = item.basePrice;
        switch (priceType) {
          case ComponentPriceType.FIXED:
            finalPrice = priceValue ?? item.basePrice;
            break;
          case ComponentPriceType.MARKUP_PERCENT:
            finalPrice = Math.round(item.basePrice * (1 + (priceValue ?? 0) / 100));
            break;
          case ComponentPriceType.DISCOUNT_PERCENT:
            finalPrice = Math.round(item.basePrice * (1 - (priceValue ?? 0) / 100));
            break;
          case ComponentPriceType.MARKUP_FIXED:
            finalPrice = item.basePrice + (priceValue ?? 0);
            break;
          case ComponentPriceType.DISCOUNT_FIXED:
            finalPrice = Math.max(0, item.basePrice - (priceValue ?? 0));
            break;
          case ComponentPriceType.FREE:
          case ComponentPriceType.INCLUDED:
            finalPrice = 0;
            break;
        }

        return { ...item, priceType, priceValue, finalPrice };
      });
      onItemsChange(newItems);
    },
    [items, onItemsChange]
  );

  const handlePriceValueChange = useCallback(
    (itemId: string, priceValue: number | null) => {
      const newItems = items.map((item) => {
        if (item.id !== itemId) return item;

        // Recalculate final price
        let finalPrice = item.basePrice;
        const value = priceValue ?? 0;
        switch (item.priceType) {
          case ComponentPriceType.FIXED:
            finalPrice = value;
            break;
          case ComponentPriceType.MARKUP_PERCENT:
            finalPrice = Math.round(item.basePrice * (1 + value / 100));
            break;
          case ComponentPriceType.DISCOUNT_PERCENT:
            finalPrice = Math.round(item.basePrice * (1 - value / 100));
            break;
          case ComponentPriceType.MARKUP_FIXED:
            finalPrice = item.basePrice + value;
            break;
          case ComponentPriceType.DISCOUNT_FIXED:
            finalPrice = Math.max(0, item.basePrice - value);
            break;
        }

        return { ...item, priceValue, finalPrice };
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
      {
        headerName: "",
        field: "sortIndex",
        width: 40,
        rowDrag: true,
        cellRenderer: () => <HolderOutlined style={{ color: "#999", cursor: "grab" }} />,
        suppressMovable: true,
      },
      {
        headerName: "Product",
        field: "productId",
        flex: 2,
        minWidth: 200,
        cellRenderer: ProductCellRenderer,
      },
      {
        headerName: "Base Price",
        field: "basePrice",
        width: 120,
        cellRenderer: BasePriceCellRenderer,
      },
      {
        headerName: "Price Rule",
        field: "priceType",
        width: 200,
        cellRenderer: (params: ICellRendererParams<IComponentItem>) => (
          <PriceRuleCellRenderer
            {...params}
            onPriceTypeChange={handlePriceTypeChange}
            onPriceValueChange={handlePriceValueChange}
          />
        ),
      },
      {
        headerName: "Final",
        field: "finalPrice",
        width: 100,
        cellRenderer: FinalPriceCellRenderer,
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
        resizable: false,
      },
    ],
    [handlePriceTypeChange, handlePriceValueChange, handleDelete, handleDuplicate, onEditVariants]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
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
    <div className={styles.gridWrapper}>
      <AgGridReact<IComponentItem>
        ref={gridRef}
        rowData={items}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={getRowId}
        rowDragManaged
        animateRows
        domLayout="autoHeight"
        rowHeight={52}
        headerHeight={36}
        onRowDragEnd={handleRowDragEnd}
      />
    </div>
  );
};

export default ComponentsTable;
