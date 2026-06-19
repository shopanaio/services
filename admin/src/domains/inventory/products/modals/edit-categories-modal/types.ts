import type { TreeDataNode } from "antd";
import type { ApiCategory } from "@/graphql/types";

export interface CategoryTreeNode extends TreeDataNode {
  category: ApiCategory;
  children?: CategoryTreeNode[];
}

export interface IEditCategoriesModalProps {
  productId?: string;
  primaryCategoryId?: string | null;
  categoryIds?: string[];
  availableCategories?: ApiCategory[];
  categoryHierarchy?: Record<string, string | null>;
  onSave?: (data: {
    primaryCategoryId: string | null;
    categoryIds: string[];
  }) => void;
}
