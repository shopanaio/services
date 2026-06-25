"use client";

import {
  Breadcrumb,
  Button,
  Dropdown,
  Flex,
  Tag,
  Typography,
} from "antd";
import {
  FolderOutlined,
  MoreOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ApiCategory } from "@/graphql/types";
import { useHierarchyStyles } from "../category-details-card.styles";

interface HierarchySectionProps {
  category: ApiCategory;
  onEditParent?: () => void;
  onClearParent?: () => void;
  onEditSubcategories?: () => void;
  onRemoveSubcategory?: (subcategory: ApiCategory) => void;
}

export const HierarchySection = ({
  category,
  onEditParent,
  onClearParent,
  onEditSubcategories,
  onRemoveSubcategory,
}: HierarchySectionProps) => {
  const { styles } = useHierarchyStyles();
  const subcategories = category.children;

  const breadcrumbItems = [
    { title: "Home" },
    ...category.ancestors.map((ancestor) => ({ title: ancestor.name })),
    { title: <strong>{category.name}</strong> },
  ];

  const hasSubcategories = subcategories.length > 0;

  return (
    <Paper data-testid="category-hierarchy-section">
      <PaperHeader
        title="Hierarchy"
        actions={
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                {
                  key: "edit-parent",
                  label: <span data-testid="category-hierarchy-edit-parent-menu-item">Edit parent</span>,
                  disabled: !onEditParent,
                },
                {
                  key: "edit-subcategories",
                  label: (
                    <span data-testid="category-hierarchy-add-subcategories-menu-item">
                      Add subcategories
                    </span>
                  ),
                  disabled: !onEditSubcategories,
                },
              ],
              onClick: ({ key }) => {
                if (key === "edit-parent") {
                  onEditParent?.();
                  return;
                }

                if (key === "edit-subcategories") {
                  onEditSubcategories?.();
                }
              },
            }}
          >
            <Button
              size="small"
              icon={<MoreOutlined />}
              data-testid="category-hierarchy-actions-button"
            />
          </Dropdown>
        }
      />

      <Flex vertical gap={8} style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary" className={styles.sectionLabel}>
          Breadcrumbs
        </Typography.Text>
        <Breadcrumb
          items={breadcrumbItems}
          data-testid="category-hierarchy-breadcrumb"
        />
      </Flex>

      <Flex vertical gap={8} style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary" className={styles.sectionLabel}>
          Parent
        </Typography.Text>
        <Flex
          align="center"
          gap={8}
          data-testid="category-hierarchy-parent"
        >
          {category.parent ? (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "change",
                    label: "Change parent",
                    onClick: onEditParent,
                  },
                  {
                    key: "clear",
                    label: "Clear parent",
                    onClick: onClearParent,
                    disabled: !onClearParent,
                  },
                ],
              }}
            >
              <Tag color="blue" style={{ cursor: "pointer" }}>
                <Flex align="center" gap={4}>
                  <FolderOutlined />
                  {category.parent.name}
                  <MoreOutlined />
                </Flex>
              </Tag>
            </Dropdown>
          ) : (
            <Tag
              variant="outlined"
              onClick={onEditParent}
              style={{
                cursor: "pointer",
                background: "transparent",
                borderStyle: "dashed",
              }}
            >
              <Flex align="center" gap={4}>
                <PlusOutlined />
                Add Parent
              </Flex>
            </Tag>
          )}
        </Flex>
      </Flex>

      <Typography.Text type="secondary" className={styles.sectionLabel}>
        Subcategories ({subcategories.length})
      </Typography.Text>

      {hasSubcategories ? (
        <Flex gap={4} wrap="wrap" style={{ marginTop: 8 }}>
          {subcategories.map((child) => (
            <Dropdown
              key={child.id}
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "delete",
                    label: "Delete subcategory",
                    onClick: () => onRemoveSubcategory?.(child),
                    disabled: !onRemoveSubcategory,
                  },
                ],
              }}
            >
              <Tag color="default" style={{ cursor: "pointer" }}>
                <Flex align="center" gap={4}>
                  {child.name}
                  <MoreOutlined />
                </Flex>
              </Tag>
            </Dropdown>
          ))}
          <Tag
            variant="outlined"
            onClick={onEditSubcategories}
            style={{
              cursor: "pointer",
              background: "transparent",
              borderStyle: "dashed",
            }}
          >
            <Flex align="center" gap={4}>
              <PlusOutlined />
              Add Subcategories
            </Flex>
          </Tag>
        </Flex>
      ) : (
        <Flex gap={4} wrap="wrap" style={{ marginTop: 8 }}>
          <Tag
            variant="outlined"
            onClick={onEditSubcategories}
            style={{
              cursor: "pointer",
              background: "transparent",
              borderStyle: "dashed",
            }}
          >
            <Flex align="center" gap={4}>
              <PlusOutlined />
              Add Subcategories
            </Flex>
          </Tag>
        </Flex>
      )}
    </Paper>
  );
};
