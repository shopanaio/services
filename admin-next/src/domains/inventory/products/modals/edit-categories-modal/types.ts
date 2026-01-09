import type { TreeDataNode } from "antd";
import type { ICategory } from "../../mocks/types";

export interface ICategoryTreeNode extends TreeDataNode {
  category: ICategory;
  children?: ICategoryTreeNode[];
}

export interface IEditCategoriesModalProps {
  productId?: string;
  primaryCategoryId?: string | null;
  categoryIds?: string[];
  availableCategories?: ICategory[];
  categoryHierarchy?: Record<string, string | null>;
  onSave?: (data: {
    primaryCategoryId: string | null;
    categoryIds: string[];
  }) => void;
}
