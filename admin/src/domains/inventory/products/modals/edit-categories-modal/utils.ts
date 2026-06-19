import type { ApiCategory } from "@/graphql/types";
import type { CategoryTreeNode } from "./types";

export const createCategoryHierarchy = (
  categories: ApiCategory[],
): Record<string, string | null> =>
  Object.fromEntries(
    categories.map((category) => [category.id, category.parent?.id ?? null]),
  );

export const buildCategoryTree = (
  categories: ApiCategory[],
  hierarchy: Record<string, string | null>,
  searchTerm: string
): CategoryTreeNode[] => {
  const childrenMap = new Map<string | null, ApiCategory[]>();

  // Group categories by parent
  categories.forEach((cat) => {
    const parentId = hierarchy[cat.id] ?? null;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(cat);
  });

  // Filter by search term
  const matchesSearch = (cat: ApiCategory): boolean => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      cat.name.toLowerCase().includes(term) ||
      cat.handle.toLowerCase().includes(term)
    );
  };

  // Build tree recursively
  const buildNode = (category: ApiCategory): CategoryTreeNode | null => {
    const children = childrenMap.get(category.id) || [];
    const childNodes = children
      .map((child) => buildNode(child))
      .filter((node): node is CategoryTreeNode => node !== null);

    // Include if matches search or has matching descendants
    if (!matchesSearch(category) && childNodes.length === 0) {
      return null;
    }

    return {
      key: category.id,
      title: category.name,
      category,
      children: childNodes.length > 0 ? childNodes : undefined,
    };
  };

  // Build root nodes
  const rootCategories = childrenMap.get(null) || [];
  return rootCategories
    .map((cat) => buildNode(cat))
    .filter((node): node is CategoryTreeNode => node !== null);
};

export const getAllKeys = (nodes: CategoryTreeNode[]): string[] => {
  const keys: string[] = [];
  const collect = (items: CategoryTreeNode[]) => {
    items.forEach((node) => {
      keys.push(node.key as string);
      if (node.children) {
        collect(node.children);
      }
    });
  };
  collect(nodes);
  return keys;
};
