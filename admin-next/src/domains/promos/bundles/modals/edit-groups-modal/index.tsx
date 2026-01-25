"use client";

import { useCallback, useMemo } from "react";
import { Button, Dropdown } from "antd";
import { PlusOutlined, FolderOutlined, AppstoreOutlined } from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  RowDragModule,
  GetRowIdParams,
  CellValueChangedEvent,
  ICellRendererParams,
} from "ag-grid-community";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useAgGridTheme, useTreeTableDragDrop } from "@/hooks";

// Entity Picker Modal
import "@/shared/components/entity-picker-modal/register";
import {
  useProductPicker,
  type IPickableEntity,
} from "@/shared/components/entity-picker-modal";

import { useStyles } from "./edit-groups-modal.styles";
import type { ITableRow } from "./types";
import {
  NameCellRenderer,
  ActionsCellRenderer,
  PriceRuleCellRenderer,
  PriceValueCellRenderer,
} from "./components";
import type {
  IBundleGroup,
  BundleItem,
  PricingRuleTemplate,
} from "../../types";
import { BundleItemType, BundlePriceType, PRICE_RULE_OPTIONS } from "../../types";
import type { ApiProduct } from "@/graphql/types";
import { useState } from "react";

ModuleRegistry.registerModules([AllCommunityModule, RowDragModule]);

// ============================================================================
// Payload
// ============================================================================

export interface IEditGroupsModalPayload {
  groups: IBundleGroup[];
  pricingTemplates: PricingRuleTemplate[];
  onSave?: (groups: IBundleGroup[]) => void;
}

// ============================================================================
// Helpers
// ============================================================================

// Helper to determine if pricingRule is a template
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
    // Add group row
    rows.push({
      id: group.id,
      type: "group",
      name: group.title,
      parentId: null,
      sortIndex: group.sortIndex,
      level: 0,
      isRequired: group.isRequired,
      isMultiple: group.isMultiple,
      minSelection: group.minSelection,
      maxSelection: group.maxSelection,
    });

    // Add item rows
    const sortedItems = [...group.items].sort((a, b) => a.sortIndex - b.sortIndex);
    for (const item of sortedItems) {
      rows.push({
        id: item.id,
        type: "item",
        name: item.title || item.assignedProduct?.title || item.assignedVariant?.title || "Unknown",
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
      });
    }
  }

  return rows;
};

// Convert flat ITableRow[] back to IBundleGroup[]
const rowsToGroups = (rows: ITableRow[]): IBundleGroup[] => {
  const groups: IBundleGroup[] = [];

  const groupRows = rows.filter((r) => r.type === "group").sort((a, b) => a.sortIndex - b.sortIndex);

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
      pricingRule: itemRow.pricingRule ?? { priceType: BundlePriceType.BASE, priceValue: null },
    }));

    groups.push({
      id: groupRow.id,
      title: groupRow.name,
      sortIndex: groupRow.sortIndex,
      isRequired: groupRow.isRequired ?? false,
      isMultiple: groupRow.isMultiple ?? false,
      minSelection: groupRow.minSelection ?? null,
      maxSelection: groupRow.maxSelection ?? null,
      items,
    });
  }

  return groups;
};

// ============================================================================
// Component
// ============================================================================

export const EditGroupsModal = () => {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const { pop, setDirty, payload } = useModalStackContext();

  const modalPayload = payload as unknown as IEditGroupsModalPayload | undefined;
  const pricingTemplates = modalPayload?.pricingTemplates ?? [];

  // Track which group we're adding items to
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);

  // Use shared drag-drop hook
  const {
    allRows,
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
    initialRows: groupsToRows(modalPayload?.groups ?? []),
    groupType: "group",
    onRowsChange: () => setDirty(true),
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

      const existingItems = allRows.filter((r) => r.parentId === addingToGroupId);
      const maxSortIndex = existingItems.length > 0
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

  const getRowId = useCallback(
    (params: GetRowIdParams<ITableRow>) => params.data.id,
    []
  );

  const handleAddItem = useCallback(
    (groupId: string) => {
      setAddingToGroupId(groupId);
      openPicker();
    },
    [openPicker]
  );

  const handleAddGroup = useCallback(() => {
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
      isRequired: false,
      isMultiple: false,
      minSelection: null,
      maxSelection: null,
    };

    addGroup(newGroup);
  }, [allRows, addGroup]);

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

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<ITableRow>) => {
      const { data, colDef, newValue } = event;
      if (!data) return;

      if (colDef.field === "pricingRule" && data.type === "item") {
        // Handle price value change
        const rule = data.pricingRule;
        if (!rule) return;

        const priceType = isTemplate(rule) ? rule.priceType : rule.priceType;

        updateRow(data.id, {
          pricingRule: {
            priceType,
            priceValue: newValue as number | null,
          },
        } as Partial<ITableRow>);
      } else {
        updateRow(data.id, { [colDef.field as string]: newValue } as Partial<ITableRow>);
      }
    },
    [updateRow]
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
        minWidth: 300,
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
        cellRenderer: ActionsCellRenderer,
        cellRendererParams: {
          onDelete: deleteRow,
          onAddItem: handleAddItem,
          onDuplicateGroup: handleDuplicateGroup,
          onDuplicateItem: handleDuplicateItem,
        },
        sortable: false,
        filter: false,
      },
    ],
    [
      expandedIds,
      handleToggleExpand,
      allRows,
      pricingTemplates,
      handlePriceRuleChange,
      deleteRow,
      handleAddItem,
      handleDuplicateGroup,
      handleDuplicateItem,
    ]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: false,
      sortable: false,
      filter: false,
    }),
    []
  );

  // ========================================
  // Save
  // ========================================

  const handleSave = useCallback(() => {
    const groups = rowsToGroups(allRows);
    modalPayload?.onSave?.(groups);
    pop();
  }, [allRows, modalPayload, pop]);

  return (
    <ModalLayout
      name="edit-bundle-groups"
      header={
        <ModalHeader
          name="edit-bundle-groups"
          title="Edit Bundle Items"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
          }}
        />
      }
    >
      <div className={styles.container}>
        <Paper>
          <PaperHeader
            bordered={false}
            icon={<AppstoreOutlined />}
            title="Bundle Items"
            actions={
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "group",
                      label: "Add Group",
                      icon: <FolderOutlined />,
                      onClick: handleAddGroup,
                    },
                  ],
                }}
                trigger={["click"]}
              >
                <Button size="small" icon={<PlusOutlined />}>
                  Add
                </Button>
              </Dropdown>
            }
          />
        </Paper>

        <div className={styles.gridWrapper}>
          <AgGridReact<ITableRow>
            theme={agGridTheme}
            rowData={visibleRows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={getRowId}
            getRowClass={getRowClass}
            domLayout="autoHeight"
            animateRows
            suppressMovableColumns
            rowDragManaged
            onCellValueChanged={handleCellValueChanged}
            onRowDragEnter={handleRowDragEnter}
            onRowDragEnd={handleRowDragEnd}
            rowSelection="single"
          />
        </div>
      </div>
    </ModalLayout>
  );
};

export default EditGroupsModal;
