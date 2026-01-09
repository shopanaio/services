import type { ICategory } from "@/mocks/products/types";
import type { ICategoryTreeNode } from "./types";

export const buildCategoryTree = (
  categories: ICategory[],
  hierarchy: Record<string, string | null>,
  searchTerm: string
): ICategoryTreeNode[] => {
  const childrenMap = new Map<string | null, ICategory[]>();

  // Group categories by parent
  categories.forEach((cat) => {
    const parentId = hierarchy[cat.id] ?? null;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(cat);
  });

  // Filter by search term
  const matchesSearch = (cat: ICategory): boolean => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      cat.title.toLowerCase().includes(term) ||
      cat.slug.toLowerCase().includes(term)
    );
  };

  // Build tree recursively
  const buildNode = (category: ICategory): ICategoryTreeNode | null => {
    const children = childrenMap.get(category.id) || [];
    const childNodes = children
      .map((child) => buildNode(child))
      .filter((node): node is ICategoryTreeNode => node !== null);

    // Include if matches search or has matching descendants
    if (!matchesSearch(category) && childNodes.length === 0) {
      return null;
    }

    return {
      key: category.id,
      title: category.title,
      category,
      children: childNodes.length > 0 ? childNodes : undefined,
    };
  };

  // Build root nodes
  const rootCategories = childrenMap.get(null) || [];
  return rootCategories
    .map((cat) => buildNode(cat))
    .filter((node): node is ICategoryTreeNode => node !== null);
};

export const getAllKeys = (nodes: ICategoryTreeNode[]): string[] => {
  const keys: string[] = [];
  const collect = (items: ICategoryTreeNode[]) => {
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
