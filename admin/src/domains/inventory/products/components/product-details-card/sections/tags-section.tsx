"use client";

import { useEffect, useState } from "react";
import { App, Tag, Typography, Flex, Dropdown } from "antd";
import { PlusOutlined, MoreOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useTagPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import type { ApiTag, ApiProductUpdateInput } from "@/graphql/types";
import { ProductTagOperationAction } from "@/graphql/types";
import { useUpdateProduct } from "@/domains/inventory/products/hooks";

interface TagItem {
  id: string;
  name: string;
}

interface ITagsSectionProps {
  productId?: string;
  productRevision?: number | null;
  tags?: ApiTag[];
  onProductRefresh?: () => Promise<unknown>;
}

const toTagItem = (tag: ApiTag): TagItem => ({
  id: tag.id,
  name: tag.name,
});

export const TagsSection = ({
  productId,
  productRevision,
  tags: initialTags = [],
  onProductRefresh,
}: ITagsSectionProps) => {
  const { message } = App.useApp();
  const { updateProduct } = useUpdateProduct();
  const [pendingTagId, setPendingTagId] = useState<string | null>(null);
  const [tags, setTags] = useState<TagItem[]>(() => initialTags.map(toTagItem));
  const initialTagsKey = initialTags.map((tag) => tag.id).join("|");

  useEffect(() => {
    setTags(initialTags.map(toTagItem));
  }, [initialTagsKey]);

  const refreshProduct = async () => {
    try {
      await onProductRefresh?.();
    } catch {
      message.warning("Tag changes saved, but product refresh failed");
    }
  };

  const saveTagOperations = async (operations: ApiProductUpdateInput["tags"]) => {
    if (!productId) {
      message.error("Product id is missing");
      return false;
    }

    const result = await updateProduct({
      productId,
      expectedRevision: productRevision,
      operations: {
        tags: operations,
      },
    });

    if (result.errors.length > 0) {
      message.error(result.errors[0].message);
      return false;
    }

    return true;
  };

  const deleteTag = async (id: string) => {
    setPendingTagId(id);
    try {
      const saved = await saveTagOperations([
        {
          tagId: id,
          action: ProductTagOperationAction.Remove,
        },
      ]);

      if (!saved) {
        return;
      }

      setTags((prev) => prev.filter((tag) => tag.id !== id));
      await refreshProduct();
      message.success("Tag removed from product");
    } finally {
      setPendingTagId(null);
    }
  };

  const addTags = async (entities: IPickableEntity[]) => {
    const existingById = new Map(tags.map((tag) => [tag.id, tag]));
    const newTags = entities
      .filter((entity) => !existingById.has(entity.id))
      .map((entity): TagItem => ({
        id: entity.id,
        name: entity.title,
      }));

    if (newTags.length === 0) {
      return;
    }

    setPendingTagId(newTags[0].id);
    try {
      const saved = await saveTagOperations(
        newTags.map((tag) => ({
          tagId: tag.id,
          action: ProductTagOperationAction.Add,
        })),
      );

      if (!saved) {
        return;
      }

      setTags((prev) => [...prev, ...newTags]);
      await refreshProduct();
      message.success(
        newTags.length === 1
          ? "Tag added to product"
          : "Tags added to product",
      );
    } finally {
      setPendingTagId(null);
    }
  };

  const { openPicker } = useTagPicker({
    excludeIds: tags.map((tag) => tag.id),
    onConfirm: (entities: IPickableEntity[]) => {
      void addTags(entities);
    },
  });

  const hasTags = tags.length > 0;
  const isPending = pendingTagId !== null;

  return (
    <Paper>
      <PaperHeader title="Tags" />
      {hasTags ? (
        <Flex gap={4} wrap="wrap">
          {tags.map((tag) => (
            <Dropdown
              key={tag.id}
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "delete",
                    label: "Delete tag",
                    onClick: () => deleteTag(tag.id),
                    disabled: isPending,
                  },
                ],
              }}
            >
              <Tag style={{ cursor: "pointer" }}>
                <Flex align="center" gap={4}>
                  {tag.name}
                  <MoreOutlined />
                </Flex>
              </Tag>
            </Dropdown>
          ))}
          <Tag
            variant="outlined"
            onClick={isPending ? undefined : openPicker}
            style={{
              cursor: isPending ? "not-allowed" : "pointer",
              background: "transparent",
              borderStyle: "dashed",
            }}
          >
            <Flex align="center" gap={4}>
              <PlusOutlined />
              Add Tag
            </Flex>
          </Tag>
        </Flex>
      ) : (
        <Flex gap={4} wrap="wrap">
          <Tag
            variant="outlined"
            onClick={isPending ? undefined : openPicker}
            style={{
              cursor: isPending ? "not-allowed" : "pointer",
              background: "transparent",
              borderStyle: "dashed",
            }}
          >
            <Flex align="center" gap={4}>
              <PlusOutlined />
              Add Tag
            </Flex>
          </Tag>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            No tags assigned
          </Typography.Text>
        </Flex>
      )}
    </Paper>
  );
};
