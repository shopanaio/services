"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
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
  RowDragEndEvent,
  RowDragEnterEvent,
  ICellRendererParams,
} from "ag-grid-community";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useAgGridTheme } from "@/hooks";

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
  const gridRef = useRef<AgGridReact<ITableRow>>(null);

  const modalPayload = payload as unknown as IEditGroupsModalPayload | undefined;
  const pricingTemplates = modalPayload?.pricingTemplates ?? [];

  // Convert groups to flat rows
  const [allRows, setAllRows] = useState<ITableRow[]>(() =>
    groupsToRows(modalPayload?.groups ?? [])
  );

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Initially expand all groups
    const initial = groupsToRows(modalPayload?.groups ?? []);
    return new Set(initial.filter((r) => r.type === "group").map((r) => r.id));
  });

  // Track which group we're adding items to
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);

  const expandedBeforeDragRef = useRef<Set<string> | null>(null);
  const draggingRowIdRef = useRef<string | null>(null);

  // Refs to avoid stale closures in drag handlers
  const allRowsRef = useRef(allRows);
  const expandedIdsRef = useRef(expandedIds);
  useEffect(() => {
    allRowsRef.current = allRows;
  }, [allRows]);
  useEffect(() => {
    expandedIdsRef.current = expandedIds;
  }, [expandedIds]);

  const markDirty = useCallback(() => setDirty(true), [setDirty]);

  // Filter visible rows based on expanded state
  const visibleRows = useMemo(() => {
    const result: ITableRow[] = [];

    const rootRows = allRows
      .filter((r) => r.parentId === null)
      .sort((a, b) => a.sortIndex - b.sortIndex);

    for (const row of rootRows) {
      result.push(row);

      // If this is a group and it's expanded, add its children (items)
      if (row.type === "group" && expandedIds.has(row.id)) {
        const children = allRows
          .filter((r) => r.parentId === row.id)
          .sort((a, b) => a.sortIndex - b.sortIndex);
        result.push(...children);
      }
    }

    return result;
  }, [allRows, expandedIds]);

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

      const newRows: ITableRow[] = products.map((product, index) => ({
        id: `item-${Date.now()}-${index}`,
        type: "item" as const,
        name: (product as ApiProduct).title || "Unknown",
        parentId: addingToGroupId,
        sortIndex: maxSortIndex + 1 + index,
        level: 1,
        itemType: "PRODUCT" as const,
        assignedProduct: product as ApiProduct,
        title: null,
        featuredImage: null,
        minQty: null,
        maxQty: null,
        pricingRule: {
          priceType: BundlePriceType.BASE,
          priceValue: null,
        },
      }));

      setAllRows((prev) => [...prev, ...newRows]);
      setExpandedIds((prev) => new Set([...prev, addingToGroupId]));
      setAddingToGroupId(null);
      markDirty();
    },
    [addingToGroupId, allRows, markDirty]
  );

  // Product picker hook
  const { openPicker } = useProductPicker({
    excludeIds: existingProductIds,
    onConfirm: handleProductsSelected,
  });

  // ========================================
  // Grid Handlers
  // ========================================

  const getRowId = useCallback(
    (params: GetRowIdParams<ITableRow>) => params.data.id,
    []
  );

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

  // Handle row drag enter - collapse all groups when dragging a group
  const handleRowDragEnter = useCallback(
    (event: RowDragEnterEvent<ITableRow>) => {
      const movingData = event.node?.data;
      if (!movingData) return;

      if (draggingRowIdRef.current === movingData.id) return;

      draggingRowIdRef.current = movingData.id;
      expandedBeforeDragRef.current = new Set(expandedIdsRef.current);

      // Collapse ALL groups when dragging a group for easier reordering
      if (movingData.type === "group") {
        setExpandedIds(new Set());
      }
    },
    []
  );

  // Handle row drag end
  const handleRowDragEnd = useCallback(
    (event: RowDragEndEvent<ITableRow>) => {
      const savedExpandedIds = expandedBeforeDragRef.current;
      draggingRowIdRef.current = null;
      expandedBeforeDragRef.current = null;

      const movingNode = event.node;
      const movingData = movingNode?.data;

      if (!movingData) {
        if (savedExpandedIds) setExpandedIds(savedExpandedIds);
        return;
      }

      // Get the new order from the grid API
      const newOrderedRows: ITableRow[] = [];
      event.api.forEachNodeAfterFilterAndSort((node) => {
        if (node.data) newOrderedRows.push(node.data);
      });

      // Update sortIndex and parentId based on the new visual order
      setAllRows((prev) => {
        const rootSortIndexMap = new Map<string, number>();
        const itemNewParentMap = new Map<string, string | null>();
        const itemSortIndexByParent = new Map<string | null, Map<string, number>>();

        let currentGroupId: string | null = null;
        let rootIndex = 0;

        for (const row of newOrderedRows) {
          if (row.type === "group") {
            currentGroupId = row.id;
            rootSortIndexMap.set(row.id, rootIndex++);
          } else if (row.type === "item") {
            if (currentGroupId === null) {
              // Item before any group - shouldn't happen, but handle it
              itemNewParentMap.set(row.id, null);
              rootSortIndexMap.set(row.id, rootIndex++);
            } else {
              // Item after a group - belongs to that group
              itemNewParentMap.set(row.id, currentGroupId);

              if (!itemSortIndexByParent.has(currentGroupId)) {
                itemSortIndexByParent.set(currentGroupId, new Map());
              }
              const parentMap = itemSortIndexByParent.get(currentGroupId)!;
              parentMap.set(row.id, parentMap.size);
            }
          }
        }

        return prev.map((r) => {
          if (r.type === "group" && rootSortIndexMap.has(r.id)) {
            return { ...r, sortIndex: rootSortIndexMap.get(r.id)! };
          }
          if (r.type === "item" && itemNewParentMap.has(r.id)) {
            const newParentId = itemNewParentMap.get(r.id)!;
            if (newParentId === null) {
              const newSortIndex = rootSortIndexMap.get(r.id) ?? r.sortIndex;
              return { ...r, parentId: null, sortIndex: newSortIndex, level: 0 };
            } else {
              const parentMap = itemSortIndexByParent.get(newParentId);
              const newSortIndex = parentMap?.get(r.id) ?? r.sortIndex;
              return { ...r, parentId: newParentId, sortIndex: newSortIndex, level: 1 };
            }
          }
          return r;
        });
      });

      // Restore expanded state after updating the order
      if (savedExpandedIds) {
        setExpandedIds(savedExpandedIds);
      }

      markDirty();
    },
    [markDirty]
  );

  // ========================================
  // CRUD Handlers
  // ========================================

  const handleDelete = useCallback(
    (id: string) => {
      setAllRows((prev) => {
        const row = prev.find((r) => r.id === id);
        if (!row) return prev;

        if (row.type === "group") {
          // Delete group and all its items
          return prev.filter((r) => r.id !== id && r.parentId !== id);
        }
        // Delete just the item
        return prev.filter((r) => r.id !== id);
      });
      markDirty();
    },
    [markDirty]
  );

  const handleAddItem = useCallback(
    (groupId: string) => {
      setAddingToGroupId(groupId);
      openPicker();
    },
    [openPicker]
  );

  const handleAddGroup = useCallback(() => {
    const newId = `grp-${Date.now()}`;

    setAllRows((prev) => {
      const maxRootSortIndex = Math.max(
        -1,
        ...prev.filter((r) => r.parentId === null).map((r) => r.sortIndex)
      );

      const newGroup: ITableRow = {
        id: newId,
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
      return [...prev, newGroup];
    });
    setExpandedIds((prev) => new Set([...prev, newId]));
    markDirty();
  }, [markDirty]);

  const handleDuplicateGroup = useCallback(
    (groupId: string) => {
      setAllRows((prev) => {
        const groupRow = prev.find((r) => r.id === groupId && r.type === "group");
        if (!groupRow) return prev;

        const newGroupId = `grp-${Date.now()}`;
        const itemRows = prev.filter((r) => r.parentId === groupId);

        const maxRootSortIndex = Math.max(
          -1,
          ...prev.filter((r) => r.parentId === null).map((r) => r.sortIndex)
        );

        const newGroupRow: ITableRow = {
          ...groupRow,
          id: newGroupId,
          name: `${groupRow.name} (copy)`,
          sortIndex: maxRootSortIndex + 1,
        };

        const newItemRows: ITableRow[] = itemRows.map((item, index) => ({
          ...item,
          id: `item-${Date.now()}-${index}`,
          parentId: newGroupId,
        }));

        setExpandedIds((ids) => new Set([...ids, newGroupId]));
        return [...prev, newGroupRow, ...newItemRows];
      });
      markDirty();
    },
    [markDirty]
  );

  const handleDuplicateItem = useCallback(
    (itemId: string) => {
      setAllRows((prev) => {
        const itemRow = prev.find((r) => r.id === itemId && r.type === "item");
        if (!itemRow) return prev;

        const siblingItems = prev.filter(
          (r) => r.type === "item" && r.parentId === itemRow.parentId
        );
        const maxSortIndex = Math.max(-1, ...siblingItems.map((r) => r.sortIndex));

        const newItemRow: ITableRow = {
          ...itemRow,
          id: `item-${Date.now()}`,
          sortIndex: maxSortIndex + 1,
        };

        return [...prev, newItemRow];
      });
      markDirty();
    },
    [markDirty]
  );

  const handlePriceRuleChange = useCallback(
    (itemId: string, pricingRule: BundleItem["pricingRule"]) => {
      setAllRows((prev) =>
        prev.map((r) => (r.id === itemId ? { ...r, pricingRule } : r))
      );
      markDirty();
    },
    [markDirty]
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

        setAllRows((prev) =>
          prev.map((r) => {
            if (r.id === data.id) {
              return {
                ...r,
                pricingRule: {
                  priceType,
                  priceValue: newValue as number | null,
                },
              };
            }
            return r;
          })
        );
      } else {
        setAllRows((prev) =>
          prev.map((r) => {
            if (r.id === data.id) {
              return { ...r, [colDef.field as string]: newValue };
            }
            return r;
          })
        );
      }

      markDirty();
    },
    [markDirty]
  );

  const getRowClass = useCallback(
    (params: { data: ITableRow | undefined }) => {
      const data = params.data;
      if (!data) return "";

      switch (data.type) {
        case "group":
          return "row-group";
        case "item":
          return "row-item";
        default:
          return "";
      }
    },
    []
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
          onDelete: handleDelete,
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
      handleDelete,
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
            ref={gridRef}
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
