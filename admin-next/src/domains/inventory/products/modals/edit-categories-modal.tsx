"use client";

import { useState, useCallback, useMemo } from "react";
import { createStyles } from "antd-style";
import {
  Typography,
  Flex,
  Input,
  Tree,
  Empty,
  Tag,
  Radio,
} from "antd";
import type { TreeDataNode, TreeProps } from "antd";
import {
  SearchOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  StarFilled,
} from "@ant-design/icons";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper } from "../components/paper";
import type { ICategory } from "../mocks/types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 16,
  },
  searchWrapper: {
    marginBottom: 8,
  },
  treeWrapper: {
    maxHeight: 400,
    overflowY: "auto",
    "& .ant-tree-checkbox": {
      marginInlineEnd: 4,
    },
    "& .ant-tree-node-content-wrapper": {
      display: "flex",
      alignItems: "center",
      flex: 1,
    },
    "& .ant-tree-title": {
      flex: 1,
    },
  },
  nodeTitle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
  },
  nodeInfo: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  nodeIcon: {
    color: token.colorPrimary,
    fontSize: 14,
    flexShrink: 0,
  },
  nodeText: {
    display: "flex",
    alignItems: "baseline",
    gap: 4,
    minWidth: 0,
  },
  nodeLabel: {
    fontSize: 13,
  },
  nodeSlug: {
    fontSize: 11,
    color: token.colorTextSecondary,
  },
  nodeActions: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  primaryTag: {
    margin: 0,
    fontSize: 11,
  },
  primaryRadio: {
    marginRight: 0,
  },
  selectionSummary: {
    padding: 12,
    background: token.colorBgLayout,
    borderRadius: 8,
  },
  summaryLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: token.colorTextSecondary,
    marginBottom: 4,
    display: "block",
  },
  selectedList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  emptyState: {
    padding: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 8,
    display: "block",
  },
  sectionHint: {
    fontSize: 11,
    color: token.colorTextSecondary,
    marginBottom: 12,
    display: "block",
  },
}));

// ============================================================================
// Mock Categories Data (hierarchical)
// ============================================================================

const createCategory = (id: string, title: string, slug: string): ICategory => ({
  id,
  title,
  slug,
  description: null,
  excerpt: null,
  seoTitle: null,
  seoDescription: null,
  status: "PUBLISHED" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  cover: null,
  gallery: [],
});

const mockCategories: ICategory[] = [
  // Electronics (Level 0)
  createCategory("cat-1", "Electronics", "electronics"),
  createCategory("cat-1-1", "Smartphones", "smartphones"),
  createCategory("cat-1-1-1", "iPhone", "iphone"),
  createCategory("cat-1-1-2", "Samsung Galaxy", "samsung-galaxy"),
  createCategory("cat-1-1-3", "Google Pixel", "google-pixel"),
  createCategory("cat-1-1-4", "OnePlus", "oneplus"),
  createCategory("cat-1-2", "Laptops", "laptops"),
  createCategory("cat-1-2-1", "Gaming Laptops", "gaming-laptops"),
  createCategory("cat-1-2-2", "Ultrabooks", "ultrabooks"),
  createCategory("cat-1-2-3", "Workstations", "workstations"),
  createCategory("cat-1-3", "Tablets", "tablets"),
  createCategory("cat-1-3-1", "iPad", "ipad"),
  createCategory("cat-1-3-2", "Android Tablets", "android-tablets"),
  createCategory("cat-1-4", "Audio", "audio"),
  createCategory("cat-1-4-1", "Headphones", "headphones"),
  createCategory("cat-1-4-1-1", "Over-Ear", "over-ear"),
  createCategory("cat-1-4-1-2", "In-Ear", "in-ear"),
  createCategory("cat-1-4-1-3", "Wireless", "wireless-headphones"),
  createCategory("cat-1-4-2", "Speakers", "speakers"),
  createCategory("cat-1-4-2-1", "Bluetooth Speakers", "bluetooth-speakers"),
  createCategory("cat-1-4-2-2", "Home Audio", "home-audio"),
  createCategory("cat-1-5", "Cameras", "cameras"),
  createCategory("cat-1-5-1", "DSLR", "dslr"),
  createCategory("cat-1-5-2", "Mirrorless", "mirrorless"),
  createCategory("cat-1-5-3", "Action Cameras", "action-cameras"),

  // Clothing (Level 0)
  createCategory("cat-2", "Clothing", "clothing"),
  createCategory("cat-2-1", "Men's Clothing", "mens-clothing"),
  createCategory("cat-2-1-1", "T-Shirts", "mens-tshirts"),
  createCategory("cat-2-1-2", "Shirts", "mens-shirts"),
  createCategory("cat-2-1-3", "Pants", "mens-pants"),
  createCategory("cat-2-1-4", "Jackets", "mens-jackets"),
  createCategory("cat-2-1-5", "Suits", "mens-suits"),
  createCategory("cat-2-2", "Women's Clothing", "womens-clothing"),
  createCategory("cat-2-2-1", "Dresses", "womens-dresses"),
  createCategory("cat-2-2-2", "Tops", "womens-tops"),
  createCategory("cat-2-2-3", "Skirts", "womens-skirts"),
  createCategory("cat-2-2-4", "Pants", "womens-pants"),
  createCategory("cat-2-3", "Kids' Clothing", "kids-clothing"),
  createCategory("cat-2-3-1", "Boys", "boys-clothing"),
  createCategory("cat-2-3-2", "Girls", "girls-clothing"),
  createCategory("cat-2-4", "Shoes", "shoes"),
  createCategory("cat-2-4-1", "Sneakers", "sneakers"),
  createCategory("cat-2-4-2", "Boots", "boots"),
  createCategory("cat-2-4-3", "Sandals", "sandals"),
  createCategory("cat-2-4-4", "Formal Shoes", "formal-shoes"),

  // Home & Garden (Level 0)
  createCategory("cat-3", "Home & Garden", "home-garden"),
  createCategory("cat-3-1", "Furniture", "furniture"),
  createCategory("cat-3-1-1", "Living Room", "living-room-furniture"),
  createCategory("cat-3-1-1-1", "Sofas", "sofas"),
  createCategory("cat-3-1-1-2", "Coffee Tables", "coffee-tables"),
  createCategory("cat-3-1-1-3", "TV Stands", "tv-stands"),
  createCategory("cat-3-1-2", "Bedroom", "bedroom-furniture"),
  createCategory("cat-3-1-2-1", "Beds", "beds"),
  createCategory("cat-3-1-2-2", "Wardrobes", "wardrobes"),
  createCategory("cat-3-1-2-3", "Nightstands", "nightstands"),
  createCategory("cat-3-1-3", "Office", "office-furniture"),
  createCategory("cat-3-1-3-1", "Desks", "desks"),
  createCategory("cat-3-1-3-2", "Office Chairs", "office-chairs"),
  createCategory("cat-3-2", "Kitchen", "kitchen"),
  createCategory("cat-3-2-1", "Appliances", "kitchen-appliances"),
  createCategory("cat-3-2-2", "Cookware", "cookware"),
  createCategory("cat-3-2-3", "Dinnerware", "dinnerware"),
  createCategory("cat-3-3", "Garden", "garden"),
  createCategory("cat-3-3-1", "Outdoor Furniture", "outdoor-furniture"),
  createCategory("cat-3-3-2", "Plants", "plants"),
  createCategory("cat-3-3-3", "Garden Tools", "garden-tools"),

  // Sports & Outdoors (Level 0)
  createCategory("cat-4", "Sports & Outdoors", "sports-outdoors"),
  createCategory("cat-4-1", "Fitness", "fitness"),
  createCategory("cat-4-1-1", "Gym Equipment", "gym-equipment"),
  createCategory("cat-4-1-2", "Yoga", "yoga"),
  createCategory("cat-4-2", "Outdoor Recreation", "outdoor-recreation"),
  createCategory("cat-4-2-1", "Camping", "camping"),
  createCategory("cat-4-2-2", "Hiking", "hiking"),
  createCategory("cat-4-3", "Team Sports", "team-sports"),
  createCategory("cat-4-3-1", "Football", "football"),
  createCategory("cat-4-3-2", "Basketball", "basketball"),
  createCategory("cat-4-3-3", "Soccer", "soccer"),

  // Beauty & Health (Level 0)
  createCategory("cat-5", "Beauty & Health", "beauty-health"),
  createCategory("cat-5-1", "Skincare", "skincare"),
  createCategory("cat-5-2", "Makeup", "makeup"),
  createCategory("cat-5-3", "Hair Care", "hair-care"),
  createCategory("cat-5-4", "Fragrances", "fragrances"),

  // Books & Media (Level 0)
  createCategory("cat-6", "Books & Media", "books-media"),
  createCategory("cat-6-1", "Books", "books"),
  createCategory("cat-6-1-1", "Fiction", "fiction"),
  createCategory("cat-6-1-2", "Non-Fiction", "non-fiction"),
  createCategory("cat-6-1-3", "Children's Books", "childrens-books"),
  createCategory("cat-6-2", "Music", "music"),
  createCategory("cat-6-3", "Movies", "movies"),
];

// Mock hierarchy mapping (categoryId -> parentId)
const mockHierarchy: Record<string, string | null> = {
  "cat-1": null,
  "cat-1-1": "cat-1",
  "cat-1-1-1": "cat-1-1",
  "cat-1-1-2": "cat-1-1",
  "cat-1-1-3": "cat-1-1",
  "cat-1-1-4": "cat-1-1",
  "cat-1-2": "cat-1",
  "cat-1-2-1": "cat-1-2",
  "cat-1-2-2": "cat-1-2",
  "cat-1-2-3": "cat-1-2",
  "cat-1-3": "cat-1",
  "cat-1-3-1": "cat-1-3",
  "cat-1-3-2": "cat-1-3",
  "cat-1-4": "cat-1",
  "cat-1-4-1": "cat-1-4",
  "cat-1-4-1-1": "cat-1-4-1",
  "cat-1-4-1-2": "cat-1-4-1",
  "cat-1-4-1-3": "cat-1-4-1",
  "cat-1-4-2": "cat-1-4",
  "cat-1-4-2-1": "cat-1-4-2",
  "cat-1-4-2-2": "cat-1-4-2",
  "cat-1-5": "cat-1",
  "cat-1-5-1": "cat-1-5",
  "cat-1-5-2": "cat-1-5",
  "cat-1-5-3": "cat-1-5",
  "cat-2": null,
  "cat-2-1": "cat-2",
  "cat-2-1-1": "cat-2-1",
  "cat-2-1-2": "cat-2-1",
  "cat-2-1-3": "cat-2-1",
  "cat-2-1-4": "cat-2-1",
  "cat-2-1-5": "cat-2-1",
  "cat-2-2": "cat-2",
  "cat-2-2-1": "cat-2-2",
  "cat-2-2-2": "cat-2-2",
  "cat-2-2-3": "cat-2-2",
  "cat-2-2-4": "cat-2-2",
  "cat-2-3": "cat-2",
  "cat-2-3-1": "cat-2-3",
  "cat-2-3-2": "cat-2-3",
  "cat-2-4": "cat-2",
  "cat-2-4-1": "cat-2-4",
  "cat-2-4-2": "cat-2-4",
  "cat-2-4-3": "cat-2-4",
  "cat-2-4-4": "cat-2-4",
  "cat-3": null,
  "cat-3-1": "cat-3",
  "cat-3-1-1": "cat-3-1",
  "cat-3-1-1-1": "cat-3-1-1",
  "cat-3-1-1-2": "cat-3-1-1",
  "cat-3-1-1-3": "cat-3-1-1",
  "cat-3-1-2": "cat-3-1",
  "cat-3-1-2-1": "cat-3-1-2",
  "cat-3-1-2-2": "cat-3-1-2",
  "cat-3-1-2-3": "cat-3-1-2",
  "cat-3-1-3": "cat-3-1",
  "cat-3-1-3-1": "cat-3-1-3",
  "cat-3-1-3-2": "cat-3-1-3",
  "cat-3-2": "cat-3",
  "cat-3-2-1": "cat-3-2",
  "cat-3-2-2": "cat-3-2",
  "cat-3-2-3": "cat-3-2",
  "cat-3-3": "cat-3",
  "cat-3-3-1": "cat-3-3",
  "cat-3-3-2": "cat-3-3",
  "cat-3-3-3": "cat-3-3",
  "cat-4": null,
  "cat-4-1": "cat-4",
  "cat-4-1-1": "cat-4-1",
  "cat-4-1-2": "cat-4-1",
  "cat-4-2": "cat-4",
  "cat-4-2-1": "cat-4-2",
  "cat-4-2-2": "cat-4-2",
  "cat-4-3": "cat-4",
  "cat-4-3-1": "cat-4-3",
  "cat-4-3-2": "cat-4-3",
  "cat-4-3-3": "cat-4-3",
  "cat-5": null,
  "cat-5-1": "cat-5",
  "cat-5-2": "cat-5",
  "cat-5-3": "cat-5",
  "cat-5-4": "cat-5",
  "cat-6": null,
  "cat-6-1": "cat-6",
  "cat-6-1-1": "cat-6-1",
  "cat-6-1-2": "cat-6-1",
  "cat-6-1-3": "cat-6-1",
  "cat-6-2": "cat-6",
  "cat-6-3": "cat-6",
};

// ============================================================================
// Types
// ============================================================================

interface ICategoryTreeNode extends TreeDataNode {
  category: ICategory;
  children?: ICategoryTreeNode[];
}

// ============================================================================
// Helpers
// ============================================================================

const buildCategoryTree = (
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

const getAllKeys = (nodes: ICategoryTreeNode[]): string[] => {
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

// ============================================================================
// Main Component
// ============================================================================

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

export const EditCategoriesModal = () => {
  const { styles } = useStyles();
  const { pop, setDirty, payload } = useModalStackContext();

  const {
    primaryCategoryId: initialPrimaryId,
    categoryIds: initialCategoryIds,
    availableCategories = mockCategories,
    categoryHierarchy = mockHierarchy,
    onSave,
  } = (payload as IEditCategoriesModalProps) || {};

  const [searchTerm, setSearchTerm] = useState("");
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string | null>(
    initialPrimaryId ?? null
  );
  const [checkedKeys, setCheckedKeys] = useState<string[]>(
    initialCategoryIds || []
  );
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() => {
    // Initially expand root categories
    return availableCategories
      .filter((c) => categoryHierarchy[c.id] === null)
      .map((c) => c.id);
  });

  const markDirty = useCallback(() => setDirty(true), [setDirty]);

  // Build tree data
  const treeData = useMemo(
    () => buildCategoryTree(availableCategories, categoryHierarchy, searchTerm),
    [availableCategories, categoryHierarchy, searchTerm]
  );

  // Auto-expand all when searching
  const displayExpandedKeys = useMemo(() => {
    if (searchTerm) {
      return getAllKeys(treeData);
    }
    return expandedKeys;
  }, [searchTerm, treeData, expandedKeys]);

  // Category map for quick lookup
  const categoryMap = useMemo(
    () => new Map(availableCategories.map((c) => [c.id, c])),
    [availableCategories]
  );

  // Handle check
  const handleCheck: TreeProps["onCheck"] = useCallback(
    (checked) => {
      const keys = Array.isArray(checked) ? checked : checked.checked;
      const newCheckedKeys = keys as string[];
      setCheckedKeys(newCheckedKeys);

      // If primary category is unchecked, clear it
      if (primaryCategoryId && !newCheckedKeys.includes(primaryCategoryId)) {
        setPrimaryCategoryId(null);
      }

      markDirty();
    },
    [primaryCategoryId, markDirty]
  );

  // Handle expand
  const handleExpand: TreeProps["onExpand"] = useCallback((keys) => {
    setExpandedKeys(keys as string[]);
  }, []);

  // Handle primary change
  const handlePrimaryChange = useCallback(
    (categoryId: string) => {
      setPrimaryCategoryId(categoryId);
      markDirty();
    },
    [markDirty]
  );

  // Render tree node title
  const titleRender = useCallback(
    (nodeData: TreeDataNode) => {
      const node = nodeData as ICategoryTreeNode;
      const { category } = node;
      const isChecked = checkedKeys.includes(category.id);
      const isPrimary = primaryCategoryId === category.id;
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = displayExpandedKeys.includes(category.id);

      return (
        <div className={styles.nodeTitle}>
          <div className={styles.nodeInfo}>
            {hasChildren ? (
              isExpanded ? (
                <FolderOpenOutlined className={styles.nodeIcon} />
              ) : (
                <FolderOutlined className={styles.nodeIcon} />
              )
            ) : (
              <FolderOutlined className={styles.nodeIcon} />
            )}
            <div className={styles.nodeText}>
              <Typography.Text className={styles.nodeLabel}>
                {category.title}
              </Typography.Text>
              <Typography.Text className={styles.nodeSlug}>
                /{category.slug}
              </Typography.Text>
            </div>
          </div>
          <div className={styles.nodeActions}>
            {isPrimary && (
              <Tag
                color="gold"
                className={styles.primaryTag}
                icon={<StarFilled />}
              >
                Primary
              </Tag>
            )}
            {isChecked && (
              <Radio
                checked={isPrimary}
                onChange={() => handlePrimaryChange(category.id)}
                onClick={(e) => e.stopPropagation()}
                className={styles.primaryRadio}
              />
            )}
          </div>
        </div>
      );
    },
    [styles, checkedKeys, primaryCategoryId, displayExpandedKeys, handlePrimaryChange]
  );

  // Get selected categories for summary
  const selectedCategories = useMemo(
    () =>
      checkedKeys
        .map((id) => categoryMap.get(id))
        .filter((c): c is ICategory => c !== undefined),
    [checkedKeys, categoryMap]
  );

  const primaryCategory = primaryCategoryId
    ? categoryMap.get(primaryCategoryId)
    : null;

  const secondaryCategories = selectedCategories.filter(
    (c) => c.id !== primaryCategoryId
  );

  // Handle save
  const handleSave = useCallback(() => {
    onSave?.({
      primaryCategoryId,
      categoryIds: checkedKeys,
    });
    pop();
  }, [primaryCategoryId, checkedKeys, onSave, pop]);

  return (
    <ModalLayout
      name="edit-categories"
      header={
        <ModalHeader
          name="edit-categories"
          title="Edit Categories"
          onClose={pop}
          submitButtonProps={{
            children: "Save Changes",
            onClick: handleSave,
          }}
        />
      }
    >
      <div className={styles.container}>
        {/* Selection Summary */}
        <Paper className={styles.selectionSummary}>
          <Flex gap={24}>
            <div style={{ flex: 1 }}>
              <Typography.Text className={styles.summaryLabel}>
                Primary Category
              </Typography.Text>
              {primaryCategory ? (
                <Tag color="gold" icon={<StarFilled />}>
                  {primaryCategory.title}
                </Tag>
              ) : (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Not selected
                </Typography.Text>
              )}
            </div>
            <div style={{ flex: 2 }}>
              <Typography.Text className={styles.summaryLabel}>
                Additional Categories ({secondaryCategories.length})
              </Typography.Text>
              {secondaryCategories.length > 0 ? (
                <div className={styles.selectedList}>
                  {secondaryCategories.map((cat) => (
                    <Tag key={cat.id} color="blue">
                      {cat.title}
                    </Tag>
                  ))}
                </div>
              ) : (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  No additional categories
                </Typography.Text>
              )}
            </div>
          </Flex>
        </Paper>

        {/* Category Selection */}
        <Paper>
          <Typography.Text className={styles.sectionTitle}>
            Select Categories
          </Typography.Text>
          <Typography.Text className={styles.sectionHint}>
            Check categories to assign, then click the radio button to set the primary category.
          </Typography.Text>

          <div className={styles.searchWrapper}>
            <Input
              placeholder="Search categories..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </div>

          <div className={styles.treeWrapper}>
            {treeData.length > 0 ? (
              <Tree
                checkable
                blockNode
                treeData={treeData}
                checkedKeys={checkedKeys}
                expandedKeys={displayExpandedKeys}
                onCheck={handleCheck}
                onExpand={handleExpand}
                titleRender={titleRender}
                selectable={false}
              />
            ) : (
              <Empty
                description={
                  searchTerm
                    ? "No categories match your search"
                    : "No categories available"
                }
                className={styles.emptyState}
              />
            )}
          </div>
        </Paper>
      </div>
    </ModalLayout>
  );
};
