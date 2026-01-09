"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Button, Typography, Dropdown } from "antd";
import {
  PlusOutlined,
  FolderOutlined,
  TagsOutlined,
} from "@ant-design/icons";
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
} from "ag-grid-community";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper } from "../../components/Paper";
import { PaperHeader } from "@/domains/inventory/products/components/PaperHeader";

import { useStyles } from "./EditAttributesModal.styles";
import type { IAttributeRow } from "./types";
import { createMockData } from "./mocks";
import { NameCellRenderer, ActionsCellRenderer } from "./components";

ModuleRegistry.registerModules([AllCommunityModule, RowDragModule]);

export const EditAttributesModal = () => {
  const { styles } = useStyles();
  const { pop, setDirty } = useModalStackContext();
  const gridRef = useRef<AgGridReact<IAttributeRow>>(null);

  const [allRows, setAllRows] = useState<IAttributeRow[]>(createMockData);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Initially expand all groups
    const initial = createMockData();
    return new Set(initial.filter((r) => r.type === "group").map((r) => r.id));
  });
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

  // Filter visible rows based on expanded state (only groups can be collapsed)
  const visibleRows = useMemo(() => {
    const result: IAttributeRow[] = [];

    // Get root-level rows (both groups and attributes with parentId: null)
    const rootRows = allRows
      .filter((r) => r.parentId === null)
      .sort((a, b) => a.sortIndex - b.sortIndex);

    for (const row of rootRows) {
      result.push(row);

      // If this is a group and it's expanded, add its children (attributes)
      if (row.type === "group" && expandedIds.has(row.id)) {
        const children = allRows
          .filter((r) => r.parentId === row.id)
          .sort((a, b) => a.sortIndex - b.sortIndex);
        result.push(...children);
      }
    }

    return result;
  }, [allRows, expandedIds]);

  const getRowId = useCallback(
    (params: GetRowIdParams<IAttributeRow>) => params.data.id,
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
    (event: RowDragEnterEvent<IAttributeRow>) => {
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
    (event: RowDragEndEvent<IAttributeRow>) => {
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
      const newOrderedRows: IAttributeRow[] = [];
      event.api.forEachNodeAfterFilterAndSort((node) => {
        if (node.data) newOrderedRows.push(node.data);
      });

      // Update sortIndex and parentId based on the new visual order
      // Rule: attributes before the first group stay at root level (parentId: null)
      //       attributes after a group belong to that group
      setAllRows((prev) => {
        const rootSortIndexMap = new Map<string, number>(); // For root-level items (groups + root attrs)
        const attrNewParentMap = new Map<string, string | null>(); // attrId -> new parentId (null = root)
        const attrSortIndexByParent = new Map<
          string | null,
          Map<string, number>
        >(); // parentId -> (attrId -> sortIndex)

        let currentGroupId: string | null = null;
        let rootIndex = 0;

        for (const row of newOrderedRows) {
          if (row.type === "group") {
            currentGroupId = row.id;
            rootSortIndexMap.set(row.id, rootIndex++);
          } else if (row.type === "attribute") {
            if (currentGroupId === null) {
              // Attribute before any group - stays at root level
              attrNewParentMap.set(row.id, null);
              rootSortIndexMap.set(row.id, rootIndex++);
            } else {
              // Attribute after a group - belongs to that group
              attrNewParentMap.set(row.id, currentGroupId);

              if (!attrSortIndexByParent.has(currentGroupId)) {
                attrSortIndexByParent.set(currentGroupId, new Map());
              }
              const parentMap = attrSortIndexByParent.get(currentGroupId)!;
              parentMap.set(row.id, parentMap.size);
            }
          }
        }

        return prev.map((r) => {
          if (r.type === "group" && rootSortIndexMap.has(r.id)) {
            return { ...r, sortIndex: rootSortIndexMap.get(r.id)! };
          }
          if (r.type === "attribute" && attrNewParentMap.has(r.id)) {
            const newParentId = attrNewParentMap.get(r.id)!;
            if (newParentId === null) {
              // Root-level attribute
              const newSortIndex = rootSortIndexMap.get(r.id) ?? r.sortIndex;
              return {
                ...r,
                parentId: null,
                sortIndex: newSortIndex,
                level: 0,
              };
            } else {
              // Grouped attribute
              const parentMap = attrSortIndexByParent.get(newParentId);
              const newSortIndex = parentMap?.get(r.id) ?? r.sortIndex;
              return {
                ...r,
                parentId: newParentId,
                sortIndex: newSortIndex,
                level: 1,
              };
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

  const handleDelete = useCallback(
    (id: string) => {
      setAllRows((prev) => {
        const row = prev.find((r) => r.id === id);
        if (!row) return prev;

        if (row.type === "group") {
          // Delete group and all its attributes
          return prev.filter((r) => r.id !== id && r.parentId !== id);
        }
        // Delete just the attribute
        return prev.filter((r) => r.id !== id);
      });
      markDirty();
    },
    [markDirty]
  );

  const handleAddAttribute = useCallback(
    (parentId: string) => {
      setAllRows((prev) => {
        const parent = prev.find((r) => r.id === parentId);
        if (!parent || parent.type !== "group") return prev;

        const newId = `a-${Date.now()}`;
        const newName = "New Attribute";

        const newRow: IAttributeRow = {
          id: newId,
          type: "attribute",
          name: newName,
          displayType: "text",
          parentId,
          sortIndex: prev.filter(
            (r) => r.parentId === parentId && r.type === "attribute"
          ).length,
          level: 1,
          values: [],
        };

        return [...prev, newRow];
      });

      setExpandedIds((prev) => new Set([...prev, parentId]));
      markDirty();
    },
    [markDirty]
  );

  const handleAddGroup = useCallback(() => {
    const newId = `g-${Date.now()}`;

    setAllRows((prev) => {
      // Find the max sortIndex among root-level items
      const maxRootSortIndex = Math.max(
        -1,
        ...prev.filter((r) => r.parentId === null).map((r) => r.sortIndex)
      );

      const newGroup: IAttributeRow = {
        id: newId,
        type: "group",
        name: "New Group",
        parentId: null,
        sortIndex: maxRootSortIndex + 1,
        level: 0,
      };
      return [...prev, newGroup];
    });
    setExpandedIds((prev) => new Set([...prev, newId]));
    markDirty();
  }, [markDirty]);

  const handleAddRootAttribute = useCallback(() => {
    const newId = `a-${Date.now()}`;

    setAllRows((prev) => {
      // Find if there are any groups
      const firstGroupIndex = prev
        .filter((r) => r.parentId === null)
        .sort((a, b) => a.sortIndex - b.sortIndex)
        .findIndex((r) => r.type === "group");

      let newSortIndex: number;
      if (firstGroupIndex === -1) {
        // No groups - add at the end
        const maxRootSortIndex = Math.max(
          -1,
          ...prev.filter((r) => r.parentId === null).map((r) => r.sortIndex)
        );
        newSortIndex = maxRootSortIndex + 1;
      } else {
        // Insert before the first group by shifting group sortIndexes
        const rootRows = prev
          .filter((r) => r.parentId === null)
          .sort((a, b) => a.sortIndex - b.sortIndex);
        const firstGroup = rootRows.find((r) => r.type === "group");
        newSortIndex = firstGroup?.sortIndex ?? 0;

        // Shift all groups and their positions
        return [
          ...prev.map((r) => {
            if (r.parentId === null && r.sortIndex >= newSortIndex) {
              return { ...r, sortIndex: r.sortIndex + 1 };
            }
            return r;
          }),
          {
            id: newId,
            type: "attribute" as const,
            name: "New Attribute",
            displayType: "text" as const,
            parentId: null,
            sortIndex: newSortIndex,
            level: 0,
            values: [],
          },
        ];
      }

      const newRow: IAttributeRow = {
        id: newId,
        type: "attribute",
        name: "New Attribute",
        displayType: "text",
        parentId: null,
        sortIndex: newSortIndex,
        level: 0,
        values: [],
      };
      return [...prev, newRow];
    });

    markDirty();
  }, [markDirty]);

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<IAttributeRow>) => {
      const { data, colDef, newValue } = event;
      if (!data) return;

      setAllRows((prev) =>
        prev.map((r) => {
          if (r.id === data.id) {
            return { ...r, [colDef.field as string]: newValue };
          }
          return r;
        })
      );

      markDirty();
    },
    [markDirty]
  );

  const getRowClass = useCallback(
    (params: { data: IAttributeRow | undefined }) => {
      const data = params.data;
      if (!data) return "";

      switch (data.type) {
        case "group":
          return "row-group";
        case "attribute":
          return "row-attribute";
        default:
          return "";
      }
    },
    []
  );

  const columnDefs = useMemo<ColDef<IAttributeRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Name",
        flex: 1,
        minWidth: 200,
        editable: true,
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
        headerName: "Values",
        flex: 2,
        minWidth: 300,
        editable: (params) => params.data?.type === "attribute",
        valueGetter: (params) => {
          if (params.data?.type !== "attribute" || !params.data?.values)
            return "";
          return params.data.values.map((v) => v.name).join(", ");
        },
        sortable: false,
        filter: false,
      },
      {
        headerName: "",
        width: 60,
        cellRenderer: ActionsCellRenderer,
        cellRendererParams: {
          onDelete: handleDelete,
          onAdd: handleAddAttribute,
        },
        sortable: false,
        filter: false,
      },
    ],
    [handleDelete, handleAddAttribute, handleToggleExpand, expandedIds, allRows]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: false,
      sortable: false,
      filter: false,
    }),
    []
  );

  const handleSave = useCallback(() => {
    console.log("Saving attributes:", allRows);
    pop();
  }, [allRows, pop]);

  return (
    <ModalLayout
      name="edit-attributes"
      header={
        <ModalHeader
          name="edit-attributes"
          title="Edit Product Attributes"
          onClose={pop}
          submitButtonProps={{
            children: "Save Changes",
            onClick: handleSave,
          }}
        />
      }
    >
      <div className={styles.container}>
        <Paper>
          <PaperHeader
            bordered={false}
            title="Attributes"
            actions={
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "attribute",
                      label: "Add Attribute",
                      icon: <TagsOutlined />,
                    },
                    {
                      key: "group",
                      label: "Add Group",
                      icon: <FolderOutlined />,
                    },
                  ],
                  onClick: ({ key }) => {
                    if (key === "attribute") handleAddRootAttribute();
                    else if (key === "group") handleAddGroup();
                  },
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

        <div className={`${styles.gridWrapper} ag-theme-quartz`}>
          <AgGridReact<IAttributeRow>
            ref={gridRef}
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
        <Paper>
          <Typography.Text>
            Define product characteristics. Organize attributes into logical
            groups for structured display.
          </Typography.Text>
        </Paper>
      </div>
    </ModalLayout>
  );
};
