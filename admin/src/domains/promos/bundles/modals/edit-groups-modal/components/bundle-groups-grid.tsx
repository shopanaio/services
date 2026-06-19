"use client";

import { useCallback, useMemo, useState, forwardRef, useImperativeHandle } from "react";
import { createStyles } from "antd-style";
import { ColDef, ICellRendererParams } from "ag-grid-community";
import { EditorGrid } from "@/shared/components/editor-grid";
import {
  DropdownCellRenderer,
  YES_NO_OPTIONS,
} from "@/shared/components/editor-grid/cells";
import { useTreeTableDragDrop } from "@/hooks";
import { useBundleItemVariantSettingsModal } from "@/domains/promos/bundles/modals";

import "@/shared/components/entity-picker-modal/register";
import {
  useProductPicker,
} from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";

import type { ITableRow } from "../types";
import {
  NameCellRenderer,
  ActionsCellRenderer,
  PriceRuleCellRenderer,
  PriceValueCellRenderer,
} from "./index";
import type {
  IBundleGroup,
  BundleItem,
  PricingRuleTemplate,
} from "../../../types";
import {
  BundleItemType,
  BundlePriceType,
  PRICE_RULE_OPTIONS,
} from "../../../types";
import type { ApiProduct } from "@/graphql/types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  gridWrapper: {
    height: "100%",
    width: "100%",
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
    "& .row-group": {
      fontWeight: 600,
      background: `${token.colorBgLayout} !important`,
    },
    "& .row-child": {
      background: `${token.colorBgContainer} !important`,
    },
  },
}));

// ============================================================================
// Helpers
// ============================================================================

const isTemplate = (
  rule: BundleItem["pricingRule"]
): rule is PricingRuleTemplate => {
  return "id" in rule && "name" in rule;
};

// Convert IBundleGroup[] to flat ITableRow[]
const groupsToRows = (groups: IBundleGroup[]): ITableRow[] => {
  const rows: ITableRow[] = [];
  const sortedGroups = [...groups].sort((a, b) => a.sortIndex - b.sortIndex);

  for (const group of sortedGroups) {
    rows.push({
      id: group.id,
      type: "group",
      name: group.title,
      parentId: null,
      sortIndex: group.sortIndex,
      level: 0,
      minSelection: group.minSelection,
      maxSelection: group.maxSelection,
    });

    const sortedItems = [...group.items].sort(
      (a, b) => a.sortIndex - b.sortIndex
    );
    for (const item of sortedItems) {
      rows.push({
        id: item.id,
        type: "item",
        name:
          item.title ||
          item.assignedProduct?.title ||
          item.assignedVariant?.title ||
          "Unknown",
        parentId: group.id,
        sortIndex: item.sortIndex,
        level: 1,
        itemType: item.itemType,
        assignedProduct: item.assignedProduct,
        assignedVariant: item.assignedVariant,
        excludeAssignedProductVariants: item.excludeAssignedProductVariants,
        title: item.title,
        featuredImage: item.featuredImage,
        minQty: item.minQty,
        maxQty: item.maxQty,
        pricingRule: item.pricingRule,
        visible: item.visible ?? "yes",
        selected: item.selected ?? "no",
      });
    }
  }

  return rows;
};

// Convert flat ITableRow[] back to IBundleGroup[]
export const rowsToGroups = (rows: ITableRow[]): IBundleGroup[] => {
  const groups: IBundleGroup[] = [];
  const groupRows = rows
    .filter((r) => r.type === "group")
    .sort((a, b) => a.sortIndex - b.sortIndex);

  for (const groupRow of groupRows) {
    const itemRows = rows
      .filter((r) => r.type === "item" && r.parentId === groupRow.id)
      .sort((a, b) => a.sortIndex - b.sortIndex);

    const items: BundleItem[] = itemRows.map((itemRow) => ({
      id: itemRow.id,
      itemType: itemRow.itemType as BundleItemType,
      sortIndex: itemRow.sortIndex,
      assignedProduct: itemRow.assignedProduct,
      assignedVariant: itemRow.assignedVariant,
      excludeAssignedProductVariants: itemRow.excludeAssignedProductVariants,
      title: itemRow.title ?? null,
      featuredImage: itemRow.featuredImage ?? null,
      minQty: itemRow.minQty ?? null,
      maxQty: itemRow.maxQty ?? null,
      pricingRule: itemRow.pricingRule ?? {
        priceType: BundlePriceType.BASE,
        priceValue: null,
      },
      visible: itemRow.visible ?? "yes",
      selected: itemRow.selected ?? "no",
    }));

    groups.push({
      id: groupRow.id,
      title: groupRow.name,
      sortIndex: groupRow.sortIndex,
      minSelection: groupRow.minSelection ?? null,
      maxSelection: groupRow.maxSelection ?? null,
      items,
    });
  }

  return groups;
};

// ============================================================================
// Types
// ============================================================================

export interface BundleGroupsGridHandle {
  addGroup: () => void;
  getRows: () => ITableRow[];
}

interface BundleGroupsGridProps {
  groups: IBundleGroup[];
  pricingTemplates: PricingRuleTemplate[];
  onRowsChange: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const BundleGroupsGrid = forwardRef<BundleGroupsGridHandle, BundleGroupsGridProps>(
  ({ groups, pricingTemplates, onRowsChange }, ref) => {
    const { styles } = useStyles();
    const { push: openVariantSettingsModal } = useBundleItemVariantSettingsModal();

    const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);
    const [expandedProducts, setExpandedProducts] = useState<
      Map<string, ITableRow>
    >(new Map());

    // Use shared drag-drop hook
    const {
      allRows,
      setAllRows,
      visibleRows,
      expandedIds,
      handleToggleExpand,
      expandGroup,
      handleRowDragEnter,
      handleRowDragEnd,
      getRowClass,
      addGroup,
      addChild,
      deleteRow,
      duplicateGroup,
      duplicateChild,
      updateRow,
    } = useTreeTableDragDrop<ITableRow>({
      initialRows: groupsToRows(groups),
      groupType: "group",
      onRowsChange: () => onRowsChange(),
    });

    // Get existing product IDs for exclusion in picker
    const existingProductIds = useMemo(() => {
      if (!addingToGroupId) return [];
      return allRows
        .filter((r) => r.parentId === addingToGroupId && r.itemType === "PRODUCT")
        .map((r) => r.assignedProduct?.id)
        .filter(Boolean) as string[];
    }, [allRows, addingToGroupId]);

    // Transform selected products to table rows
    const handleProductsSelected = useCallback(
      (products: IPickableEntity[]) => {
        if (!addingToGroupId) return;

        const existingItems = allRows.filter(
          (r) => r.parentId === addingToGroupId
        );
        const maxSortIndex =
          existingItems.length > 0
            ? Math.max(...existingItems.map((r) => r.sortIndex))
            : -1;

        products.forEach((product, index) => {
          const newRow: ITableRow = {
            id: `item-${Date.now()}-${index}`,
            type: "item",
            name: (product as ApiProduct).title || "Unknown",
            parentId: addingToGroupId,
            sortIndex: maxSortIndex + 1 + index,
            level: 1,
            itemType: "PRODUCT",
            assignedProduct: product as ApiProduct,
            title: null,
            featuredImage: null,
            minQty: null,
            maxQty: null,
            pricingRule: {
              priceType: BundlePriceType.BASE,
              priceValue: null,
            },
            visible: "yes",
            selected: "no",
          };
          addChild(newRow);
        });

        expandGroup(addingToGroupId);
        setAddingToGroupId(null);
      },
      [addingToGroupId, allRows, addChild, expandGroup]
    );

    // Product picker hook
    const { openPicker } = useProductPicker({
      excludeIds: existingProductIds,
      onConfirm: handleProductsSelected,
    });

    // ========================================
    // Handlers
    // ========================================

    const handleAddItem = useCallback(
      (groupId: string) => {
        setAddingToGroupId(groupId);
        openPicker();
      },
      [openPicker]
    );

    const handleAddGroupClick = useCallback(() => {
      const maxRootSortIndex = Math.max(
        -1,
        ...allRows.filter((r) => r.parentId === null).map((r) => r.sortIndex)
      );

      const newGroup: ITableRow = {
        id: `grp-${Date.now()}`,
        type: "group",
        name: "New Group",
        parentId: null,
        sortIndex: maxRootSortIndex + 1,
        level: 0,
        minSelection: null,
        maxSelection: null,
      };

      addGroup(newGroup);
    }, [allRows, addGroup]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      addGroup: handleAddGroupClick,
      getRows: () => allRows,
    }), [handleAddGroupClick, allRows]);

    const handleDuplicateGroup = useCallback(
      (groupId: string) => {
        duplicateGroup(groupId, (_row, isGroup, index) =>
          isGroup ? `grp-${Date.now()}` : `item-${Date.now()}-${index}`
        );
      },
      [duplicateGroup]
    );

    const handleDuplicateItem = useCallback(
      (itemId: string) => {
        duplicateChild(itemId, () => `item-${Date.now()}`);
      },
      [duplicateChild]
    );

    const handlePriceRuleChange = useCallback(
      (itemId: string, pricingRule: BundleItem["pricingRule"]) => {
        updateRow(itemId, { pricingRule } as Partial<ITableRow>);
      },
      [updateRow]
    );

    const handleVisibleChange = useCallback(
      (itemId: string, visible: string) => {
        updateRow(itemId, { visible: visible as "yes" | "no" } as Partial<ITableRow>);
      },
      [updateRow]
    );

    const handleSelectedChange = useCallback(
      (itemId: string, selected: string) => {
        updateRow(itemId, { selected: selected as "yes" | "no" } as Partial<ITableRow>);
      },
      [updateRow]
    );

    // ========================================
    // Variant Handlers
    // ========================================

    const handleEditVariants = useCallback(
      (row: ITableRow) => {
        if (row.itemType !== "PRODUCT" || !row.assignedProduct) return;

        const assignedProduct = row.assignedProduct;
        const variantsFromConnection =
          assignedProduct.variants?.edges?.map((e) => e.node) ?? [];

        const priceType =
          row.pricingRule && "id" in row.pricingRule
            ? "BASE"
            : row.pricingRule?.priceType ?? "BASE";
        const priceValue =
          row.pricingRule && "id" in row.pricingRule
            ? null
            : row.pricingRule?.priceValue ?? null;

        openVariantSettingsModal({
          itemId: row.id,
          productId: assignedProduct.id,
          productTitle: row.title ?? assignedProduct.title,
          availableVariantIds: row.excludeAssignedProductVariants ?? null,
          priceType: priceType as BundlePriceType,
          priceValue,
          variants: variantsFromConnection.map((v) => {
            const sku = v.inventoryItem?.sku ?? "";

            return {
              id: v.id,
              title: v.title ?? (sku || v.id),
              sku,
              price:
                typeof v.price?.amountMinor === "bigint"
                  ? Number(v.price.amountMinor)
                  : typeof v.price?.amountMinor === "number"
                  ? v.price.amountMinor
                  : 0,
              stock: v.inventoryItem?.stock?.[0]?.quantityOnHand ?? 0,
              options: v.selectedOptions?.map((o) => ({
                optionId: o.optionId,
                value: o.optionValueId,
              })),
            };
          }),
          options: assignedProduct.options?.map((o) => ({
            id: o.id,
            name: o.name,
            values: o.values?.map((v) => v.name) ?? [],
          })),
          showAsVariants: false,
          onSave: (data: {
            availableVariantIds: string[] | null;
            showAsVariants: boolean;
          }) => {
            updateRow(row.id, {
              excludeAssignedProductVariants: data.availableVariantIds,
            } as Partial<ITableRow>);
          },
        });
      },
      [openVariantSettingsModal, updateRow]
    );

    const handleIncludeVariants = useCallback(
      (row: ITableRow) => {
        if (row.itemType !== "PRODUCT" || !row.assignedProduct) return;

        const assignedProduct = row.assignedProduct;
        const variantsFromConnection =
          assignedProduct.variants?.edges?.map((e) => e.node) ?? [];
        if (variantsFromConnection.length === 0) return;

        setExpandedProducts((prev) =>
          new Map(prev).set(assignedProduct.id, row)
        );

        setAllRows((prev) => {
          const productIndex = prev.findIndex((r) => r.id === row.id);
          if (productIndex === -1) return prev;

          const variantRows: ITableRow[] = variantsFromConnection.map(
            (variant, index) => {
              const sku = variant.inventoryItem?.sku;

              return {
                id: `item-${Date.now()}-${index}`,
                type: "item" as const,
                name: variant.title ?? sku ?? "Unknown Variant",
                parentId: row.parentId,
                sortIndex: row.sortIndex + index,
                level: 1,
                itemType: "VARIANT" as const,
                assignedVariant: variant,
                minQty: row.minQty,
                maxQty: row.maxQty,
                pricingRule: row.pricingRule,
                title: row.title,
                featuredImage: row.featuredImage,
                visible: row.visible ?? "yes",
                selected: row.selected ?? "no",
              };
            },
          );

          const newRows = [...prev];
          newRows.splice(productIndex, 1, ...variantRows);

          return newRows.map((r) => {
            if (r.parentId === row.parentId && r.type === "item") {
              const itemsInGroup = newRows.filter(
                (x) => x.parentId === row.parentId && x.type === "item"
              );
              const itemIndex = itemsInGroup.findIndex((x) => x.id === r.id);
              return { ...r, sortIndex: itemIndex };
            }
            return r;
          });
        });
      },
      [setAllRows]
    );

    const handleShowAsProduct = useCallback(
      (row: ITableRow) => {
        if (row.itemType !== "VARIANT" || !row.assignedVariant) return;

        const productId = row.assignedVariant.product?.id;
        if (!productId) return;

        const storedProduct = expandedProducts.get(productId);
        if (!storedProduct) return;

        setExpandedProducts((prev) => {
          const newMap = new Map(prev);
          newMap.delete(productId);
          return newMap;
        });

        setAllRows((prev) => {
          const firstVariantIndex = prev.findIndex(
            (r) =>
              r.itemType === "VARIANT" &&
              r.assignedVariant?.product?.id === productId
          );
          if (firstVariantIndex === -1) return prev;

          const newRows = prev.filter(
            (r) =>
              !(
                r.itemType === "VARIANT" &&
                r.assignedVariant?.product?.id === productId
              )
          );

          newRows.splice(firstVariantIndex, 0, {
            ...storedProduct,
            sortIndex: firstVariantIndex,
          });

          return newRows.map((r) => {
            if (r.parentId === storedProduct.parentId && r.type === "item") {
              const itemsInGroup = newRows.filter(
                (x) => x.parentId === storedProduct.parentId && x.type === "item"
              );
              const itemIndex = itemsInGroup.findIndex((x) => x.id === r.id);
              return { ...r, sortIndex: itemIndex };
            }
            return r;
          });
        });
      },
      [expandedProducts, setAllRows]
    );

    const handleSetFieldValue = useCallback(
      (rowId: string, field: string, _originalValue: unknown, newValue: unknown) => {
        const row = allRows.find((r) => r.id === rowId);
        if (!row) return;

        if (field === "pricingRule" && row.type === "item") {
          const rule = row.pricingRule;
          if (!rule) return;

          const priceType = isTemplate(rule) ? rule.priceType : rule.priceType;

          updateRow(rowId, {
            pricingRule: {
              priceType,
              priceValue: newValue as number | null,
            },
          } as Partial<ITableRow>);
        } else if (field === "minSelection" || field === "maxSelection") {
          const value = newValue === "" ? null : Number(newValue);
          updateRow(rowId, { [field]: value } as Partial<ITableRow>);
        } else if (field === "minQty" || field === "maxQty") {
          const value = newValue === "" ? null : Number(newValue);
          updateRow(rowId, { [field]: value } as Partial<ITableRow>);
        } else {
          updateRow(rowId, { [field]: newValue } as Partial<ITableRow>);
        }
      },
      [allRows, updateRow]
    );

    // ========================================
    // Column Definitions
    // ========================================

    const columnDefs = useMemo<ColDef<ITableRow>[]>(
      () => [
        {
          field: "name",
          headerName: "Name",
          flex: 2,
          minWidth: 250,
          editable: (params) => params.data?.type === "group",
          resizable: true,
          rowDrag: true,
          cellRenderer: NameCellRenderer,
          cellRendererParams: {
            expandedIds,
            onToggleExpand: handleToggleExpand,
            allRows,
          },
        },
        {
          headerName: "Visible",
          field: "visible",
          minWidth: 120,
          width: 120,
          suppressDoubleClickEdit: true,
          cellStyle: { padding: 0 },
          cellRenderer: (params: ICellRendererParams<ITableRow>) => (
            <DropdownCellRenderer
              {...params}
              options={YES_NO_OPTIONS}
              onChange={handleVisibleChange}
              valueField="visible"
              shouldRender={(data) => data?.type === "item"}
            />
          ),
        },
        {
          headerName: "Selected",
          field: "selected",
          minWidth: 120,
          width: 120,
          suppressDoubleClickEdit: true,
          cellStyle: { padding: 0 },
          cellRenderer: (params: ICellRendererParams<ITableRow>) => (
            <DropdownCellRenderer
              {...params}
              options={YES_NO_OPTIONS}
              onChange={handleSelectedChange}
              valueField="selected"
              shouldRender={(data) => data?.type === "item"}
            />
          ),
        },
        {
          headerName: "Min Qty",
          field: "minSelection",
          minWidth: 120,
          width: 120,
          editable: true,
          valueGetter: (params) => {
            if (!params.data) return null;
            return params.data.type === "group"
              ? params.data.minSelection
              : params.data.minQty;
          },
          valueSetter: (params) => {
            if (!params.data) return false;
            const value =
              params.newValue === "" ? null : Number(params.newValue);
            if (params.data.type === "group") {
              updateRow(params.data.id, {
                minSelection: value,
              } as Partial<ITableRow>);
            } else {
              updateRow(params.data.id, { minQty: value } as Partial<ITableRow>);
            }
            return true;
          },
          cellEditor: "agNumberCellEditor",
          cellEditorParams: { min: 0, precision: 0 },
        },
        {
          headerName: "Max Qty",
          field: "maxSelection",
          minWidth: 120,
          width: 120,
          editable: true,
          valueGetter: (params) => {
            if (!params.data) return null;
            return params.data.type === "group"
              ? params.data.maxSelection
              : params.data.maxQty;
          },
          valueSetter: (params) => {
            if (!params.data) return false;
            const value =
              params.newValue === "" ? null : Number(params.newValue);
            if (params.data.type === "group") {
              updateRow(params.data.id, {
                maxSelection: value,
              } as Partial<ITableRow>);
            } else {
              updateRow(params.data.id, { maxQty: value } as Partial<ITableRow>);
            }
            return true;
          },
          cellEditor: "agNumberCellEditor",
          cellEditorParams: { min: 0, precision: 0 },
        },
        {
          headerName: "Pricing Rule",
          field: "pricingRule",
          minWidth: 200,
          width: 200,
          suppressDoubleClickEdit: true,
          cellStyle: { padding: 0 },
          cellRenderer: (params: ICellRendererParams<ITableRow>) => (
            <PriceRuleCellRenderer
              {...params}
              pricingTemplates={pricingTemplates}
              onPriceRuleChange={handlePriceRuleChange}
            />
          ),
        },
        {
          headerName: "Pricing Value",
          field: "pricingRule",
          minWidth: 120,
          width: 120,
          resizable: false,
          editable: (params) => {
            if (params.data?.type !== "item") return false;
            const rule = params.data?.pricingRule;
            if (!rule) return false;
            const priceType = isTemplate(rule) ? rule.priceType : rule.priceType;
            const option = PRICE_RULE_OPTIONS.find((r) => r.value === priceType);
            return !!option?.requiresValue;
          },
          valueGetter: (params) => {
            if (params.data?.type !== "item") return null;
            const rule = params.data?.pricingRule;
            if (!rule) return null;
            return isTemplate(rule) ? rule.priceValue : rule.priceValue;
          },
          cellRenderer: PriceValueCellRenderer,
          cellEditor: "agNumberCellEditor",
          cellEditorParams: { min: 0, precision: 0 },
        },
        {
          headerName: "",
          width: 60,
          pinned: "right",
          cellRenderer: ActionsCellRenderer,
          cellRendererParams: {
            onDelete: deleteRow,
            onAddItem: handleAddItem,
            onDuplicateGroup: handleDuplicateGroup,
            onDuplicateItem: handleDuplicateItem,
            onEditVariants: handleEditVariants,
            onIncludeVariants: handleIncludeVariants,
            onShowAsProduct: handleShowAsProduct,
          },
          sortable: false,
          filter: false,
          resizable: false,
        },
      ],
      [
        expandedIds,
        handleToggleExpand,
        allRows,
        pricingTemplates,
        handlePriceRuleChange,
        handleVisibleChange,
        handleSelectedChange,
        updateRow,
        deleteRow,
        handleAddItem,
        handleDuplicateGroup,
        handleDuplicateItem,
        handleEditVariants,
        handleIncludeVariants,
        handleShowAsProduct,
      ]
    );

    return (
      <div className={styles.gridWrapper}>
        <EditorGrid<ITableRow>
          rows={allRows}
          displayRows={visibleRows}
          columns={columnDefs}
          selectableColumns={[]}
          rowHeight={52}
          headerHeight={44}
          getRowClass={(data) => getRowClass({ data })}
          onSetFieldValue={handleSetFieldValue}
          rowDragManaged
          onRowDragEnter={handleRowDragEnter}
          onRowDragEnd={handleRowDragEnd}
          domLayout="autoHeight"
        />
      </div>
    );
  }
);

BundleGroupsGrid.displayName = "BundleGroupsGrid";

export { groupsToRows };
