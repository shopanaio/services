import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { RowDragEndEvent, RowDragEnterEvent } from "ag-grid-community";

// ============================================================================
// Types
// ============================================================================

/**
 * Base interface for rows in a tree table with drag-drop support.
 * Rows can be either "group" (parent) or child rows.
 */
export interface ITreeTableRow {
  id: string;
  type: string;
  name: string;
  parentId: string | null;
  sortIndex: number;
  level: number;
}

export interface IUseTreeTableDragDropOptions<T extends ITreeTableRow> {
  /** Initial rows data */
  initialRows: T[];
  /** The type value that identifies group rows (e.g., "group") */
  groupType: string;
  /** Callback when rows are updated */
  onRowsChange?: (rows: T[]) => void;
  /** Whether to initially expand all groups (default: true) */
  initiallyExpandAll?: boolean;
}

export interface IUseTreeTableDragDropResult<T extends ITreeTableRow> {
  /** All rows (both visible and hidden) */
  allRows: T[];
  /** Set all rows directly */
  setAllRows: React.Dispatch<React.SetStateAction<T[]>>;
  /** Only visible rows (based on expanded state) */
  visibleRows: T[];
  /** Set of expanded group IDs */
  expandedIds: Set<string>;
  /** Toggle expand/collapse for a group */
  handleToggleExpand: (id: string) => void;
  /** Expand a specific group */
  expandGroup: (id: string) => void;
  /** Collapse a specific group */
  collapseGroup: (id: string) => void;
  /** Handler for AG Grid onRowDragEnter */
  handleRowDragEnter: (event: RowDragEnterEvent<T>) => void;
  /** Handler for AG Grid onRowDragEnd */
  handleRowDragEnd: (event: RowDragEndEvent<T>) => void;
  /** Get row class for AG Grid getRowClass */
  getRowClass: (params: { data: T | undefined }) => string;
  /** Add a new group */
  addGroup: (group: T) => void;
  /** Add a new child row to a group */
  addChild: (child: T) => void;
  /** Delete a row (and its children if it's a group) */
  deleteRow: (id: string) => void;
  /** Duplicate a group with all its children */
  duplicateGroup: (groupId: string, createNewIds: (row: T, isGroup: boolean, index: number) => string) => void;
  /** Duplicate a child row */
  duplicateChild: (childId: string, createNewId: () => string) => void;
  /** Update a specific row */
  updateRow: (id: string, updates: Partial<T>) => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useTreeTableDragDrop<T extends ITreeTableRow>({
  initialRows,
  groupType,
  onRowsChange,
  initiallyExpandAll = true,
}: IUseTreeTableDragDropOptions<T>): IUseTreeTableDragDropResult<T> {
  // ========================================
  // State
  // ========================================

  const [allRows, setAllRows] = useState<T[]>(initialRows);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (initiallyExpandAll) {
      return new Set(initialRows.filter((r) => r.type === groupType).map((r) => r.id));
    }
    return new Set();
  });

  // Refs for drag handling
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

  // ========================================
  // Computed Values
  // ========================================

  const visibleRows = useMemo(() => {
    const result: T[] = [];

    const rootRows = allRows
      .filter((r) => r.parentId === null)
      .sort((a, b) => a.sortIndex - b.sortIndex);

    for (const row of rootRows) {
      result.push(row);

      // If this is a group and it's expanded, add its children
      if (row.type === groupType && expandedIds.has(row.id)) {
        const children = allRows
          .filter((r) => r.parentId === row.id)
          .sort((a, b) => a.sortIndex - b.sortIndex);
        result.push(...children);
      }
    }

    return result;
  }, [allRows, expandedIds, groupType]);

  // ========================================
  // Expand/Collapse Handlers
  // ========================================

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

  const expandGroup = useCallback((id: string) => {
    setExpandedIds((prev) => new Set([...prev, id]));
  }, []);

  const collapseGroup = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // ========================================
  // Drag Handlers
  // ========================================

  const handleRowDragEnter = useCallback(
    (event: RowDragEnterEvent<T>) => {
      const movingData = event.node?.data;
      if (!movingData) return;

      if (draggingRowIdRef.current === movingData.id) return;

      draggingRowIdRef.current = movingData.id;
      expandedBeforeDragRef.current = new Set(expandedIdsRef.current);

      // Collapse ALL groups when dragging a group for easier reordering
      if (movingData.type === groupType) {
        setExpandedIds(new Set());
      }
    },
    [groupType]
  );

  const handleRowDragEnd = useCallback(
    (event: RowDragEndEvent<T>) => {
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
      const newOrderedRows: T[] = [];
      event.api.forEachNodeAfterFilterAndSort((node) => {
        if (node.data) newOrderedRows.push(node.data);
      });

      // Update sortIndex and parentId based on the new visual order
      setAllRows((prev) => {
        const rootSortIndexMap = new Map<string, number>();
        const childNewParentMap = new Map<string, string | null>();
        const childSortIndexByParent = new Map<string | null, Map<string, number>>();

        let currentGroupId: string | null = null;
        let rootIndex = 0;

        for (const row of newOrderedRows) {
          if (row.type === groupType) {
            currentGroupId = row.id;
            rootSortIndexMap.set(row.id, rootIndex++);
          } else {
            if (currentGroupId === null) {
              // Child before any group - stays at root level
              childNewParentMap.set(row.id, null);
              rootSortIndexMap.set(row.id, rootIndex++);
            } else {
              // Child after a group - belongs to that group
              childNewParentMap.set(row.id, currentGroupId);

              if (!childSortIndexByParent.has(currentGroupId)) {
                childSortIndexByParent.set(currentGroupId, new Map());
              }
              const parentMap = childSortIndexByParent.get(currentGroupId)!;
              parentMap.set(row.id, parentMap.size);
            }
          }
        }

        const updated = prev.map((r) => {
          if (r.type === groupType && rootSortIndexMap.has(r.id)) {
            return { ...r, sortIndex: rootSortIndexMap.get(r.id)! };
          }
          if (r.type !== groupType && childNewParentMap.has(r.id)) {
            const newParentId = childNewParentMap.get(r.id)!;
            if (newParentId === null) {
              const newSortIndex = rootSortIndexMap.get(r.id) ?? r.sortIndex;
              return { ...r, parentId: null, sortIndex: newSortIndex, level: 0 };
            } else {
              const parentMap = childSortIndexByParent.get(newParentId);
              const newSortIndex = parentMap?.get(r.id) ?? r.sortIndex;
              return { ...r, parentId: newParentId, sortIndex: newSortIndex, level: 1 };
            }
          }
          return r;
        });

        onRowsChange?.(updated);
        return updated;
      });

      // Restore expanded state after updating the order
      if (savedExpandedIds) {
        setExpandedIds(savedExpandedIds);
      }
    },
    [groupType, onRowsChange]
  );

  // ========================================
  // Row Class
  // ========================================

  const getRowClass = useCallback(
    (params: { data: T | undefined }) => {
      const data = params.data;
      if (!data) return "";

      if (data.type === groupType) {
        return "row-group";
      }
      return "row-child";
    },
    [groupType]
  );

  // ========================================
  // CRUD Operations
  // ========================================

  const addGroup = useCallback(
    (group: T) => {
      setAllRows((prev) => {
        const updated = [...prev, group];
        onRowsChange?.(updated);
        return updated;
      });
      setExpandedIds((prev) => new Set([...prev, group.id]));
    },
    [onRowsChange]
  );

  const addChild = useCallback(
    (child: T) => {
      setAllRows((prev) => {
        const updated = [...prev, child];
        onRowsChange?.(updated);
        return updated;
      });
      if (child.parentId) {
        setExpandedIds((prev) => new Set([...prev, child.parentId!]));
      }
    },
    [onRowsChange]
  );

  const deleteRow = useCallback(
    (id: string) => {
      setAllRows((prev) => {
        const row = prev.find((r) => r.id === id);
        if (!row) return prev;

        let updated: T[];
        if (row.type === groupType) {
          // Delete group and all its children
          updated = prev.filter((r) => r.id !== id && r.parentId !== id);
        } else {
          // Delete just the child
          updated = prev.filter((r) => r.id !== id);
        }

        onRowsChange?.(updated);
        return updated;
      });
    },
    [groupType, onRowsChange]
  );

  const duplicateGroup = useCallback(
    (groupId: string, createNewIds: (row: T, isGroup: boolean, index: number) => string) => {
      setAllRows((prev) => {
        const groupRow = prev.find((r) => r.id === groupId && r.type === groupType);
        if (!groupRow) return prev;

        const newGroupId = createNewIds(groupRow, true, 0);
        const childRows = prev.filter((r) => r.parentId === groupId);

        const maxRootSortIndex = Math.max(
          -1,
          ...prev.filter((r) => r.parentId === null).map((r) => r.sortIndex)
        );

        const newGroupRow: T = {
          ...groupRow,
          id: newGroupId,
          sortIndex: maxRootSortIndex + 1,
        };

        const newChildRows: T[] = childRows.map((child, index) => ({
          ...child,
          id: createNewIds(child, false, index),
          parentId: newGroupId,
        }));

        setExpandedIds((ids) => new Set([...ids, newGroupId]));

        const updated = [...prev, newGroupRow, ...newChildRows];
        onRowsChange?.(updated);
        return updated;
      });
    },
    [groupType, onRowsChange]
  );

  const duplicateChild = useCallback(
    (childId: string, createNewId: () => string) => {
      setAllRows((prev) => {
        const childRow = prev.find((r) => r.id === childId && r.type !== groupType);
        if (!childRow) return prev;

        const siblingChildren = prev.filter(
          (r) => r.type !== groupType && r.parentId === childRow.parentId
        );
        const maxSortIndex = Math.max(-1, ...siblingChildren.map((r) => r.sortIndex));

        const newChildRow: T = {
          ...childRow,
          id: createNewId(),
          sortIndex: maxSortIndex + 1,
        };

        const updated = [...prev, newChildRow];
        onRowsChange?.(updated);
        return updated;
      });
    },
    [groupType, onRowsChange]
  );

  const updateRow = useCallback(
    (id: string, updates: Partial<T>) => {
      setAllRows((prev) => {
        const updated = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
        onRowsChange?.(updated);
        return updated;
      });
    },
    [onRowsChange]
  );

  // ========================================
  // Return
  // ========================================

  return {
    allRows,
    setAllRows,
    visibleRows,
    expandedIds,
    handleToggleExpand,
    expandGroup,
    collapseGroup,
    handleRowDragEnter,
    handleRowDragEnd,
    getRowClass,
    addGroup,
    addChild,
    deleteRow,
    duplicateGroup,
    duplicateChild,
    updateRow,
  };
}
