import type { UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { NavigationMenuItem } from "../../types";

export interface FlattenedNavigationItem extends NavigationMenuItem {
  depth: number;
  index: number;
}

export function flattenTree(
  items: NavigationMenuItem[],
  parentId: string | null = null,
  depth = 0,
): FlattenedNavigationItem[] {
  return items.flatMap((item, index) => [
    { ...item, parentId, depth, index },
    ...flattenTree(item.children, item.id, depth + 1),
  ]);
}

export function buildTree(items: FlattenedNavigationItem[]): NavigationMenuItem[] {
  const roots: NavigationMenuItem[] = [];
  const nodes = new Map<string, NavigationMenuItem>();

  items.forEach((item) => nodes.set(item.id, { ...item, children: [] }));
  items.forEach((item) => {
    const node = nodes.get(item.id)!;
    const parent = item.parentId ? nodes.get(item.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  const normalize = (tree: NavigationMenuItem[]): NavigationMenuItem[] =>
    tree.map((item, index) => ({
      ...item,
      sortIndex: index,
      children: normalize(item.children),
    }));
  return normalize(roots);
}

export function getProjection(
  items: FlattenedNavigationItem[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
  dragOffset: number,
  indentationWidth: number,
) {
  const overIndex = items.findIndex(({ id }) => id === overId);
  const activeIndex = items.findIndex(({ id }) => id === activeId);
  const activeItem = items[activeIndex];
  const reordered = arrayMove(items, activeIndex, overIndex);
  const previous = reordered[overIndex - 1];
  const next = reordered[overIndex + 1];
  const projectedDepth = activeItem.depth + Math.round(dragOffset / indentationWidth);
  const maxDepth = previous ? previous.depth + 1 : 0;
  const minDepth = next ? next.depth : 0;
  const depth = Math.max(minDepth, Math.min(projectedDepth, maxDepth));

  let parentId: string | null = null;
  if (depth > 0 && previous) {
    if (depth > previous.depth) parentId = previous.id;
    else if (depth === previous.depth) parentId = previous.parentId;
    else {
      parentId =
        reordered
          .slice(0, overIndex)
          .reverse()
          .find((item) => item.depth === depth)?.parentId ?? null;
    }
  }
  return { depth, parentId };
}

export function removeItem(
  items: NavigationMenuItem[],
  id: UniqueIdentifier,
): NavigationMenuItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({ ...item, children: removeItem(item.children, id) }));
}

export function setCollapsed(
  items: NavigationMenuItem[],
  id: UniqueIdentifier,
): NavigationMenuItem[] {
  return items.map((item) =>
    item.id === id
      ? { ...item, collapsed: !item.collapsed }
      : { ...item, children: setCollapsed(item.children, id) },
  );
}

export function replaceItem(
  items: NavigationMenuItem[],
  replacement: NavigationMenuItem,
): NavigationMenuItem[] {
  return items.map((item) =>
    item.id === replacement.id
      ? { ...replacement }
      : { ...item, children: replaceItem(item.children, replacement) },
  );
}

export function removeCollapsedChildren(
  items: FlattenedNavigationItem[],
  activeId: UniqueIdentifier | null,
) {
  const excluded = new Set<UniqueIdentifier>();
  if (activeId) excluded.add(activeId);
  items.forEach((item) => {
    if (item.collapsed) excluded.add(item.id);
    if (item.parentId && excluded.has(item.parentId)) excluded.add(item.id);
  });
  return items.filter((item) => !item.parentId || !excluded.has(item.parentId));
}

export function getChildCount(items: NavigationMenuItem[], id: UniqueIdentifier): number {
  for (const item of items) {
    if (item.id === id) {
      return flattenTree(item.children).length;
    }
    const count = getChildCount(item.children, id);
    if (count) return count;
  }
  return 0;
}
