"use client";

import { useCallback, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { createStyles } from "antd-style";
import { ColDef, ICellRendererParams } from "ag-grid-community";
import { EditorGrid } from "@/shared/components/editor-grid";
import { DropdownCellRenderer, YES_NO_OPTIONS } from "@/shared/components/editor-grid/cells";
import { useTreeTableDragDrop } from "@/hooks";
import { useComponentItemVariantSettingsModal } from "@/domains/inventory/products/modals";

import "@/shared/components/entity-picker-modal/register";
import { useProductPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";

import type { ITableRow } from "../types";
import {
  NameCellRenderer,
  ActionsCellRenderer,
  PriceRuleCellRenderer,
  PriceValueCellRenderer,
} from "./index";
import type {
  ApiProduct,
  ApiProductComponentGroup,
  ApiProductComponentItem,
  ApiProductComponentPricingTemplate,
} from "@/graphql/types";
import { ProductComponentItemType } from "@/graphql/types";
import {
  ComponentPriceType,
  PRICE_RULE_OPTIONS,
} from "@/domains/inventory/products/components/product-details-card/components-ui/types";
import {
  toApiPriceRule,
  toEditorPriceRule,
  type EditorPriceRule,
} from "@/domains/inventory/products/mappers/product-component-editor.mapper";

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

const isTemplate = (rule: ITableRow["pricingRule"]): rule is ApiProductComponentPricingTemplate => {
  return !!rule && "priceRule" in rule && "name" in rule;
};

// Convert API groups to flat editor rows.
const groupsToRows = (groups: ApiProductComponentGroup[]): ITableRow[] => {
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
      sourceGroup: group,
    });

    const sortedItems = [...group.items].sort((a, b) => a.sortIndex - b.sortIndex);
    for (const item of sortedItems) {
      rows.push({
        id: item.id,
        type: "item",
        name: item.title || item.refProduct?.title || item.refVariant?.title || "Unknown",
        parentId: group.id,
        sortIndex: item.sortIndex,
        level: 1,
        itemType: item.itemType,
        assignedProduct: item.refProduct ?? undefined,
        assignedVariant: item.refVariant ?? undefined,
        title: item.title,
        featuredImage: item.featuredImage,
        minQty: item.minQty,
        maxQty: item.maxQty,
        pricingRule:
          item.pricingTemplate ?? (item.priceRule ? toEditorPriceRule(item.priceRule) : undefined),
        visible: item.visible ? "yes" : "no",
        selected: item.selected ? "yes" : "no",
        sourceItem: item,
      });
    }
  }

  return rows;
};

// Convert flat editor rows back to API groups.
export const rowsToGroups = (rows: ITableRow[]): ApiProductComponentGroup[] => {
  const groups: ApiProductComponentGroup[] = [];
  const groupRows = rows
    .filter((r) => r.type === "group")
    .sort((a, b) => a.sortIndex - b.sortIndex);

  for (const groupRow of groupRows) {
    const itemRows = rows
      .filter((r) => r.type === "item" && r.parentId === groupRow.id)
      .sort((a, b) => a.sortIndex - b.sortIndex);

    const now = new Date().toISOString();
    const group: ApiProductComponentGroup = {
      ...(groupRow.sourceGroup ?? {
        __typename: "ProductComponentGroup" as const,
        id: groupRow.id,
        createdAt: now,
        updatedAt: now,
      }),
      id: groupRow.id,
      title: groupRow.name,
      sortIndex: groupRow.sortIndex,
      minSelection: groupRow.minSelection ?? null,
      maxSelection: groupRow.maxSelection ?? null,
      items: [],
    };
    group.items = itemRows.map((itemRow): ApiProductComponentItem => {
      const pricingTemplate = isTemplate(itemRow.pricingRule) ? itemRow.pricingRule : null;
      const editorPriceRule =
        itemRow.pricingRule && !pricingTemplate
          ? (itemRow.pricingRule as EditorPriceRule)
          : { priceType: ComponentPriceType.Base, priceValue: null };
      return {
        ...(itemRow.sourceItem ?? {
          __typename: "ProductComponentItem" as const,
          id: itemRow.id,
          createdAt: now,
          updatedAt: now,
          defaultQty: 1,
          optionSelections: [],
        }),
        id: itemRow.id,
        group,
        itemType: itemRow.itemType as ProductComponentItemType,
        sortIndex: itemRow.sortIndex,
        refProduct: itemRow.assignedProduct ?? null,
        refVariant: itemRow.assignedVariant ?? null,
        title: itemRow.title ?? null,
        featuredImage: itemRow.featuredImage ?? null,
        minQty: itemRow.minQty ?? null,
        maxQty: itemRow.maxQty ?? null,
        pricingTemplate,
        priceRule: pricingTemplate
          ? null
          : toApiPriceRule(
              editorPriceRule,
              itemRow.sourceItem?.priceRule?.id ?? `${itemRow.id}-price-rule`,
            ),
        visible: itemRow.visible !== "no",
        selected: itemRow.selected === "yes",
      };
    });
    groups.push(group);
  }

  return groups;
};

// ============================================================================
// Types
// ============================================================================

export interface ComponentGroupsGridHandle {
  addGroup: () => void;
  getRows: () => ITableRow[];
}

interface ComponentGroupsGridProps {
  groups: ApiProductComponentGroup[];
  pricingTemplates: ApiProductComponentPricingTemplate[];
  onRowsChange: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const ComponentGroupsGrid = forwardRef<ComponentGroupsGridHandle, ComponentGroupsGridProps>(
  ({ groups, pricingTemplates, onRowsChange }, ref) => {
    const { styles } = useStyles();
    const { push: openVariantSettingsModal } = useComponentItemVariantSettingsModal();

    const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);
    const addingToGroupIdRef = useRef<string | null>(null);
    const [expandedProducts, setExpandedProducts] = useState<Map<string, ITableRow>>(new Map());

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
        .filter(
          (r) => r.parentId === addingToGroupId && r.itemType === ProductComponentItemType.Product,
        )
        .map((r) => r.assignedProduct?.id)
        .filter(Boolean) as string[];
    }, [allRows, addingToGroupId]);

    // Transform selected products to table rows
    const handleProductsSelected = useCallback(
      (products: IPickableEntity[]) => {
        const groupId = addingToGroupIdRef.current;
        if (!groupId) return;

        const existingItems = allRows.filter((r) => r.parentId === groupId);
        const maxSortIndex =
          existingItems.length > 0 ? Math.max(...existingItems.map((r) => r.sortIndex)) : -1;

        products.forEach((product, index) => {
          const newRow: ITableRow = {
            id: `item-${Date.now()}-${index}`,
            type: "item",
            name: (product as ApiProduct).title || "Unknown",
            parentId: groupId,
            sortIndex: maxSortIndex + 1 + index,
            level: 1,
            itemType: ProductComponentItemType.Product,
            assignedProduct: product as ApiProduct,
            title: null,
            featuredImage: null,
            minQty: null,
            maxQty: null,
            pricingRule: {
              priceType: ComponentPriceType.Base,
              priceValue: null,
            },
            visible: "yes",
            selected: "no",
          };
          addChild(newRow);
        });

        expandGroup(groupId);
        addingToGroupIdRef.current = null;
        setAddingToGroupId(null);
      },
      [allRows, addChild, expandGroup],
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
        addingToGroupIdRef.current = groupId;
        setAddingToGroupId(groupId);
        openPicker();
      },
      [openPicker],
    );

    const handleAddGroupClick = useCallback(() => {
      const maxRootSortIndex = Math.max(
        -1,
        ...allRows.filter((r) => r.parentId === null).map((r) => r.sortIndex),
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
    useImperativeHandle(
      ref,
      () => ({
        addGroup: handleAddGroupClick,
        getRows: () => allRows,
      }),
      [handleAddGroupClick, allRows],
    );

    const handleDuplicateGroup = useCallback(
      (groupId: string) => {
        duplicateGroup(groupId, (_row, isGroup, index) =>
          isGroup ? `grp-${Date.now()}` : `item-${Date.now()}-${index}`,
        );
      },
      [duplicateGroup],
    );

    const handleDuplicateItem = useCallback(
      (itemId: string) => {
        duplicateChild(itemId, () => `item-${Date.now()}`);
      },
      [duplicateChild],
    );

    const handlePriceRuleChange = useCallback(
      (itemId: string, pricingRule: ITableRow["pricingRule"]) => {
        updateRow(itemId, { pricingRule } as Partial<ITableRow>);
      },
      [updateRow],
    );

    const handleVisibleChange = useCallback(
      (itemId: string, visible: string) => {
        updateRow(itemId, { visible: visible as "yes" | "no" } as Partial<ITableRow>);
      },
      [updateRow],
    );

    const handleSelectedChange = useCallback(
      (itemId: string, selected: string) => {
        updateRow(itemId, { selected: selected as "yes" | "no" } as Partial<ITableRow>);
      },
      [updateRow],
    );

    // ========================================
    // Variant Handlers
    // ========================================

    const handleEditVariants = useCallback(
      (row: ITableRow) => {
        if (row.itemType !== ProductComponentItemType.Product || !row.assignedProduct) return;

        const assignedProduct = row.assignedProduct;
        const variantsFromConnection = assignedProduct.variants?.edges?.map((e) => e.node) ?? [];

        const editorRule = row.pricingRule
          ? isTemplate(row.pricingRule)
            ? toEditorPriceRule(row.pricingRule.priceRule)
            : row.pricingRule
          : { priceType: ComponentPriceType.Base, priceValue: null };
        const { priceType, priceValue } = editorRule;

        openVariantSettingsModal({
          itemId: row.id,
          productId: assignedProduct.id,
          productTitle: row.title ?? assignedProduct.title,
          availableVariantIds: row.excludeAssignedProductVariants ?? null,
          priceType: priceType as ComponentPriceType,
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
          onSave: (data: { availableVariantIds: string[] | null; showAsVariants: boolean }) => {
            updateRow(row.id, {
              excludeAssignedProductVariants: data.availableVariantIds,
            } as Partial<ITableRow>);
          },
        });
      },
      [openVariantSettingsModal, updateRow],
    );

    const handleIncludeVariants = useCallback(
      (row: ITableRow) => {
        if (row.itemType !== ProductComponentItemType.Product || !row.assignedProduct) return;

        const assignedProduct = row.assignedProduct;
        const variantsFromConnection = assignedProduct.variants?.edges?.map((e) => e.node) ?? [];
        if (variantsFromConnection.length === 0) return;

        setExpandedProducts((prev) => new Map(prev).set(assignedProduct.id, row));

        setAllRows((prev) => {
          const productIndex = prev.findIndex((r) => r.id === row.id);
          if (productIndex === -1) return prev;

          const variantRows: ITableRow[] = variantsFromConnection.map((variant, index) => {
            const sku = variant.inventoryItem?.sku;

            return {
              id: `item-${Date.now()}-${index}`,
              type: "item" as const,
              name: variant.title ?? sku ?? "Unknown Variant",
              parentId: row.parentId,
              sortIndex: row.sortIndex + index,
              level: 1,
              itemType: ProductComponentItemType.Variant,
              assignedVariant: variant,
              minQty: row.minQty,
              maxQty: row.maxQty,
              pricingRule: row.pricingRule,
              title: row.title,
              featuredImage: row.featuredImage,
              visible: row.visible ?? "yes",
              selected: row.selected ?? "no",
            };
          });

          const newRows = [...prev];
          newRows.splice(productIndex, 1, ...variantRows);

          return newRows.map((r) => {
            if (r.parentId === row.parentId && r.type === "item") {
              const itemsInGroup = newRows.filter(
                (x) => x.parentId === row.parentId && x.type === "item",
              );
              const itemIndex = itemsInGroup.findIndex((x) => x.id === r.id);
              return { ...r, sortIndex: itemIndex };
            }
            return r;
          });
        });
      },
      [setAllRows],
    );

    const handleShowAsProduct = useCallback(
      (row: ITableRow) => {
        if (row.itemType !== ProductComponentItemType.Variant || !row.assignedVariant) return;

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
              r.itemType === ProductComponentItemType.Variant &&
              r.assignedVariant?.product?.id === productId,
          );
          if (firstVariantIndex === -1) return prev;

          const newRows = prev.filter(
            (r) =>
              !(
                r.itemType === ProductComponentItemType.Variant &&
                r.assignedVariant?.product?.id === productId
              ),
          );

          newRows.splice(firstVariantIndex, 0, {
            ...storedProduct,
            sortIndex: firstVariantIndex,
          });

          return newRows.map((r) => {
            if (r.parentId === storedProduct.parentId && r.type === "item") {
              const itemsInGroup = newRows.filter(
                (x) => x.parentId === storedProduct.parentId && x.type === "item",
              );
              const itemIndex = itemsInGroup.findIndex((x) => x.id === r.id);
              return { ...r, sortIndex: itemIndex };
            }
            return r;
          });
        });
      },
      [expandedProducts, setAllRows],
    );

    const handleSetFieldValue = useCallback(
      (rowId: string, field: string, _originalValue: unknown, newValue: unknown) => {
        const row = allRows.find((r) => r.id === rowId);
        if (!row) return;

        if (field === "pricingRule" && row.type === "item") {
          const rule = row.pricingRule;
          if (!rule) return;

          const priceType = isTemplate(rule)
            ? toEditorPriceRule(rule.priceRule).priceType
            : rule.priceType;

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
      [allRows, updateRow],
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
            return params.data.type === "group" ? params.data.minSelection : params.data.minQty;
          },
          valueSetter: (params) => {
            if (!params.data) return false;
            const value = params.newValue === "" ? null : Number(params.newValue);
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
            return params.data.type === "group" ? params.data.maxSelection : params.data.maxQty;
          },
          valueSetter: (params) => {
            if (!params.data) return false;
            const value = params.newValue === "" ? null : Number(params.newValue);
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
            const priceType = isTemplate(rule)
              ? toEditorPriceRule(rule.priceRule).priceType
              : rule.priceType;
            const option = PRICE_RULE_OPTIONS.find((r) => r.value === priceType);
            return !!option?.requiresValue;
          },
          valueGetter: (params) => {
            if (params.data?.type !== "item") return null;
            const rule = params.data?.pricingRule;
            if (!rule) return null;
            return isTemplate(rule)
              ? toEditorPriceRule(rule.priceRule).priceValue
              : rule.priceValue;
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
      ],
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
          dataTestId="component-groups-grid"
        />
      </div>
    );
  },
);

ComponentGroupsGrid.displayName = "ComponentGroupsGrid";

export { groupsToRows };
