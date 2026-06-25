import { create } from "zustand";
import type { SidebarItem } from "@/registry";

type DynamicSidebarChildren = Record<string, SidebarItem[]>;

interface DynamicSidebarState {
  childrenByParentKey: DynamicSidebarChildren;
  setChildren: (parentKey: string, children: SidebarItem[]) => void;
  clearChildren: (parentKey: string) => void;
}

function areSidebarItemsEqual(left: SidebarItem[], right: SidebarItem[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => {
    const other = right[index];

    return (
      item.key === other?.key &&
      item.label === other.label &&
      item.path === other.path &&
      item.order === other.order &&
      item.type === other.type &&
      areSidebarItemsEqual(item.children ?? [], other.children ?? [])
    );
  });
}

function sortSidebarItems(items: SidebarItem[]): SidebarItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const orderDiff =
        (left.item.order ?? Number.MAX_SAFE_INTEGER) -
        (right.item.order ?? Number.MAX_SAFE_INTEGER);

      return orderDiff || left.index - right.index;
    })
    .map(({ item }) => item);
}

function mergeItem(
  item: SidebarItem,
  childrenByParentKey: DynamicSidebarChildren,
): SidebarItem {
  const staticChildren = item.children?.map((child) =>
    mergeItem(child, childrenByParentKey),
  );
  const dynamicChildren = childrenByParentKey[item.key]?.map((child) =>
    mergeItem(child, childrenByParentKey),
  );
  const children = sortSidebarItems([
    ...(staticChildren ?? []),
    ...(dynamicChildren ?? []),
  ]);

  if (children.length === 0) {
    return item.children ? { ...item, children: undefined } : item;
  }

  return {
    ...item,
    children,
  };
}

export function mergeDynamicSidebarItems(
  items: SidebarItem[],
  childrenByParentKey: DynamicSidebarChildren,
): SidebarItem[] {
  if (Object.keys(childrenByParentKey).length === 0) {
    return items;
  }

  return items.map((item) => mergeItem(item, childrenByParentKey));
}

export const useDynamicSidebarStore = create<DynamicSidebarState>((set) => ({
  childrenByParentKey: {},
  setChildren: (parentKey, children) =>
    set((state) => {
      const currentChildren = state.childrenByParentKey[parentKey] ?? [];

      if (areSidebarItemsEqual(currentChildren, children)) {
        return state;
      }

      return {
        childrenByParentKey: {
          ...state.childrenByParentKey,
          [parentKey]: children,
        },
      };
    }),
  clearChildren: (parentKey) =>
    set((state) => {
      if (!state.childrenByParentKey[parentKey]) {
        return state;
      }

      const childrenByParentKey = { ...state.childrenByParentKey };
      delete childrenByParentKey[parentKey];

      return { childrenByParentKey };
    }),
}));
