"use client";

import { useMemo, useState } from "react";
import { Tag, Typography, Flex, Dropdown } from "antd";
import { PlusOutlined, MoreOutlined, StarFilled } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useCategoryPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import type { ApiCategory } from "@/graphql/types";
import type { ApiCategoryCategoriesMetaInput } from "@/domains/inventory/categories/graphql";
import { createMockApiCategory } from "@/mocks/products/api-builders";

interface ICategoriesSectionProps {
  productId?: string;
  primaryCategory?: ApiCategory | null;
  categories?: ApiCategory[];
}

export const CategoriesSection = ({
  productId,
  primaryCategory: initialPrimaryCategory,
  categories: initialCategories = [],
}: ICategoriesSectionProps) => {
  const [categories, setCategories] = useState<ApiCategory[]>(() => {
    if (initialPrimaryCategory) {
      return [
        initialPrimaryCategory,
        ...initialCategories.filter(
          (cat) => cat.id !== initialPrimaryCategory.id
        ),
      ];
    }
    return initialCategories;
  });

  const [primaryCategoryId, setPrimaryCategoryId] = useState<string | null>(
    initialPrimaryCategory?.id ?? null
  );

  const primaryCategory =
    categories.find((cat) => cat.id === primaryCategoryId) ?? null;
  const nonPrimaryCategories = categories.filter(
    (cat) => cat.id !== primaryCategoryId
  );

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
    if (primaryCategoryId === id) {
      setPrimaryCategoryId(null);
    }
  };

  const setPrimary = (id: string) => {
    setPrimaryCategoryId(id);
  };

  const categoryPickerMeta = useMemo<ApiCategoryCategoriesMetaInput | undefined>(
    () =>
      productId
        ? {
            productsScope: {
              referenceIds: [productId],
              mode: "EXCLUDE",
            },
          }
        : undefined,
    [productId]
  );

  const { openPicker } = useCategoryPicker({
    excludeIds: categories.map((cat) => cat.id),
    queryMeta: categoryPickerMeta,
    onConfirm: (entities: IPickableEntity[]) => {
      const existingById = new Map(categories.map((c) => [c.id, c]));
      const newCategories = entities
        .filter((entity) => !existingById.has(entity.id))
        .map((entity) => {
          const categoryHandle =
            "handle" in entity && typeof entity.handle === "string"
              ? entity.handle
              : entity.id;

          return createMockApiCategory({
            id: entity.id,
            name: entity.title,
            handle: categoryHandle,
          });
        });
      const nextCategories = [...categories, ...newCategories];

      setCategories(nextCategories);

      if (!primaryCategoryId) {
        setPrimaryCategoryId(nextCategories[0]?.id ?? null);
      }
    },
  });

  const hasCategories = categories.length > 0;

  return (
    <Paper>
      <PaperHeader title="Categories" />
      {hasCategories ? (
        <Flex gap={4} wrap="wrap">
          {primaryCategory && (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "delete",
                    label: "Delete category",
                    onClick: () => deleteCategory(primaryCategory.id),
                  },
                ],
              }}
            >
              <Tag color="blue" style={{ cursor: "pointer" }}>
                <Flex align="center" gap={4}>
                  <StarFilled />
                  {primaryCategory.name}
                  <MoreOutlined />
                </Flex>
              </Tag>
            </Dropdown>
          )}
          {nonPrimaryCategories.map((category) => (
            <Dropdown
              key={category.id}
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "set-as-primary",
                    label: "Set as primary",
                    onClick: () => setPrimary(category.id),
                  },
                  {
                    key: "delete",
                    label: "Delete category",
                    onClick: () => deleteCategory(category.id),
                  },
                ],
              }}
            >
              <Tag color="default" style={{ cursor: "pointer" }}>
                <Flex align="center" gap={4}>
                  {category.name}
                  <MoreOutlined />
                </Flex>
              </Tag>
            </Dropdown>
          ))}
          <Tag
            variant="outlined"
            onClick={openPicker}
            style={{
              cursor: "pointer",
              background: "transparent",
              borderStyle: "dashed",
            }}
          >
            <Flex align="center" gap={4}>
              <PlusOutlined />
              Add Category
            </Flex>
          </Tag>
        </Flex>
      ) : (
        <Flex gap={4} wrap="wrap">
          <Tag
            variant="outlined"
            onClick={openPicker}
            style={{
              cursor: "pointer",
              background: "transparent",
              borderStyle: "dashed",
            }}
          >
            <Flex align="center" gap={4}>
              <PlusOutlined />
              Add Category
            </Flex>
          </Tag>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            No categories assigned
          </Typography.Text>
        </Flex>
      )}
    </Paper>
  );
};
