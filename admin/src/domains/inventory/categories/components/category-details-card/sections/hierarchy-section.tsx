"use client";

import {
  Avatar,
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
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ApiCategory } from "@/graphql/types";
import { useHierarchyStyles } from "../category-details-card.styles";

const getStatusColor = (isPublished: boolean) =>
  isPublished ? "var(--ant-color-success)" : "var(--ant-color-warning)";

const getCategoryFeaturedUrl = (category: ApiCategory): string | undefined => {
  const firstMedia = [...category.media].sort(
    (a, b) => a.sortIndex - b.sortIndex,
  )[0];
  return firstMedia?.file.url;
};

interface SubcategoryCardProps {
  child: ApiCategory;
}

const SubcategoryCard = ({ child }: SubcategoryCardProps) => {
  const { styles } = useHierarchyStyles();
  const statusColor = getStatusColor(child.isPublished);

  return (
    <div className={styles.subcategoryCard}>
      <Flex vertical align="center" gap={8}>
        <Avatar
          size={48}
          src={getCategoryFeaturedUrl(child)}
          icon={<FolderOutlined />}
          style={{ flexShrink: 0 }}
        />
        <Typography.Text strong ellipsis className={styles.subcategoryTitle}>
          {child.name}
        </Typography.Text>
        <Typography.Text type="secondary" className={styles.subcategoryMeta}>
          {child.productsCount} products
        </Typography.Text>
        <Flex align="center" gap={4}>
          <span
            className={styles.statusDot}
            style={{ background: statusColor }}
          />
          <Typography.Text style={{ fontSize: 11, color: statusColor }}>
            {child.isPublished ? "Published" : "Draft"}
          </Typography.Text>
        </Flex>
      </Flex>
    </div>
  );
};

interface HierarchySectionProps {
  category: ApiCategory;
  onEdit?: () => void;
  onAddSubcategory?: () => void;
}

export const HierarchySection = ({
  category,
  onEdit,
  onAddSubcategory,
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
    <Paper>
      <PaperHeader
        title="Hierarchy"
        actions={
          onEdit ? <EditAction onEdit={onEdit} label="Edit hierarchy" /> : null
        }
      />

      <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 12 }} />

      {category.parent && (
        <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Parent:
          </Typography.Text>
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "change", label: "Change parent", onClick: onEdit },
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
        </Flex>
      )}

      <Typography.Text type="secondary" className={styles.sectionLabel}>
        Subcategories ({subcategories.length})
      </Typography.Text>

      {hasSubcategories ? (
        <div className={styles.subcategoryGrid} style={{ marginTop: 8 }}>
          {subcategories.map((child) => (
            <SubcategoryCard key={child.id} child={child} />
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
