"use client";

import { Typography, Flex, Breadcrumb, Tag, Avatar, Button, Dropdown } from "antd";
import {
  FolderOutlined,
  PlusOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { EntityStatus } from "@/mocks/products/types";
import { useHierarchyStyles } from "../category-details-card.styles";
import type { ICategoryParent, ICategoryChild } from "../types";

// ============================================================================
// Status helpers
// ============================================================================

const getStatusColor = (status: EntityStatus) => {
  switch (status) {
    case EntityStatus.PUBLISHED:
      return "var(--ant-color-success)";
    case EntityStatus.DRAFT:
      return "var(--ant-color-warning)";
    case EntityStatus.ARCHIVED:
      return "var(--ant-color-error)";
    default:
      return "var(--ant-color-text-tertiary)";
  }
};

const getStatusLabel = (status: EntityStatus) => {
  switch (status) {
    case EntityStatus.PUBLISHED:
      return "Active";
    case EntityStatus.DRAFT:
      return "Draft";
    case EntityStatus.ARCHIVED:
      return "Archived";
    default:
      return status;
  }
};

// ============================================================================
// SubcategoryCard
// ============================================================================

interface ISubcategoryCardProps {
  child: ICategoryChild;
  onClick?: () => void;
}

const SubcategoryCard = ({ child, onClick }: ISubcategoryCardProps) => {
  const { styles } = useHierarchyStyles();
  const statusColor = getStatusColor(child.status);

  return (
    <div className={styles.subcategoryCard} onClick={onClick}>
      <Flex vertical align="center" gap={8}>
        <Avatar
          size={48}
          src={child.featured?.url}
          icon={<FolderOutlined />}
          style={{ flexShrink: 0 }}
        />
        <Typography.Text strong ellipsis className={styles.subcategoryTitle}>
          {child.title}
        </Typography.Text>
        <Typography.Text type="secondary" className={styles.subcategoryMeta}>
          {child.productCount} products
        </Typography.Text>
        <Flex align="center" gap={4}>
          <span
            className={styles.statusDot}
            style={{ background: statusColor }}
          />
          <Typography.Text
            style={{ fontSize: 11, color: statusColor }}
          >
            {getStatusLabel(child.status)}
          </Typography.Text>
        </Flex>
      </Flex>
    </div>
  );
};

// ============================================================================
// HierarchySection
// ============================================================================

interface IHierarchySectionProps {
  ancestors: ICategoryParent[];
  children: ICategoryChild[];
  categoryTitle: string;
  onEdit?: () => void;
  onAddSubcategory?: () => void;
}

export const HierarchySection = ({
  ancestors,
  children: subcategories,
  categoryTitle,
  onEdit,
  onAddSubcategory,
}: IHierarchySectionProps) => {
  const { styles } = useHierarchyStyles();

  const breadcrumbItems = [
    { title: "Home" },
    ...ancestors.map((a) => ({ title: a.title })),
    { title: <strong>{categoryTitle}</strong> },
  ];

  const parentCategory = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;

  const hasSubcategories = subcategories.length > 0;

  return (
    <Paper>
      <PaperHeader
        title="Hierarchy"
        actions={onEdit ? <EditAction onEdit={onEdit} label="Edit hierarchy" /> : undefined}
      />

      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 12 }} />

      {/* Parent Category */}
      {parentCategory && (
        <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Parent:
          </Typography.Text>
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "navigate", label: "Go to category" },
                { key: "change", label: "Change parent" },
              ],
            }}
          >
            <Tag color="blue" style={{ cursor: "pointer" }}>
              <Flex align="center" gap={4}>
                <FolderOutlined />
                {parentCategory.title}
                <MoreOutlined />
              </Flex>
            </Tag>
          </Dropdown>
        </Flex>
      )}

      {/* Subcategories label */}
      <Typography.Text type="secondary" className={styles.sectionLabel}>
        Subcategories ({subcategories.length})
      </Typography.Text>

      {/* Subcategories grid */}
      {hasSubcategories ? (
        <div className={styles.subcategoryGrid} style={{ marginTop: 8 }}>
          {subcategories.map((child) => (
            <SubcategoryCard
              key={child.id}
              child={child}
              onClick={() => console.log("Navigate to:", child.slug)}
            />
          ))}
          <div className={styles.addSubcategoryCard} onClick={onAddSubcategory}>
            <PlusOutlined style={{ fontSize: 16, marginBottom: 4 }} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Add Subcategory
            </Typography.Text>
          </div>
        </div>
      ) : (
        <Flex
          vertical
          align="center"
          justify="center"
          gap={8}
          className={styles.emptyContainer}
        >
          <FolderOutlined className={styles.emptyIcon} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            This is a leaf category with no subcategories
          </Typography.Text>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={onAddSubcategory}
          >
            Create Subcategory
          </Button>
        </Flex>
      )}
    </Paper>
  );
};
