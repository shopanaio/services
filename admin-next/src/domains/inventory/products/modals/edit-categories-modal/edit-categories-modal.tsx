"use client";

import { useState, useCallback, useMemo } from "react";
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
import { Paper } from "@/ui-kit/paper";
import type { ICategory } from "../../mocks/types";
import { useStyles } from "./edit-categories-modal.styles";
import type { IEditCategoriesModalProps, ICategoryTreeNode } from "./types";
import { mockCategories, mockHierarchy } from "./mocks";
import { buildCategoryTree, getAllKeys } from "./utils";

export type { IEditCategoriesModalProps };

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
