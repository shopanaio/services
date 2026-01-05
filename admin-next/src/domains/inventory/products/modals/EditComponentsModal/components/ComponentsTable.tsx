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
  CellValueChangedEvent,
} from "ag-grid-community";
import { Button, Dropdown } from "antd";
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
} from "../types";
import { getProductById, getVariantById } from "../mocks/mockData";

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
  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<IComponentItem>) => {
      const field = event.colDef?.field;
      if (!event.data || (field !== "priceType" && field !== "priceValue")) return;

      const newItems = items.map((item) => {
        if (item.id !== event.data?.id) return item;

        let priceType = item.priceType;
        let priceValue = item.priceValue;

        if (field === "priceType") {
          priceType = event.newValue as ComponentPriceType;
          const rule = PRICE_RULE_OPTIONS.find((r) => r.value === priceType);
          priceValue = rule?.requiresValue ? item.priceValue ?? 0 : null;
        } else if (field === "priceValue") {
          priceValue = event.newValue as number | null;
        }

        // Recalculate final price
        let finalPrice = item.basePrice;
        const value = priceValue ?? 0;
        switch (priceType) {
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
        width: 50,
        rowDrag: true,
        suppressMovable: true,
        resizable: false,
      },
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
        width: 140,
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: PRICE_RULE_OPTIONS.map((opt) => opt.value),
        },
        valueFormatter: (params) => {
          const rule = PRICE_RULE_OPTIONS.find((r) => r.value === params.value);
          return rule?.label ?? params.value;
        },
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
    [handleDelete, handleDuplicate, onEditVariants]
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
        onCellValueChanged={handleCellValueChanged}
      />
    </div>
  );
};

export default ComponentsTable;
