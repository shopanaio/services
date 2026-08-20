"use client";

import { useEffect, useState } from "react";
import { App } from "antd";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import {
  EntityTagsSection,
  type EntityDetailsTagItem,
} from "@/domains/inventory/components/entity-details-sections";
import type { ApiTag, ApiProductUpdateInput } from "@/graphql/types";
import { ProductTagOperationAction } from "@/graphql/types";
import { useUpdateProduct } from "@/domains/inventory/products/hooks";

interface ITagsSectionProps {
  productId?: string;
  productRevision?: number | null;
  tags?: ApiTag[];
  onProductRefresh?: () => Promise<unknown>;
}

const toTagItem = (tag: ApiTag): EntityDetailsTagItem => ({
  id: tag.id,
  name: tag.name,
  handle: tag.handle,
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
  const [tags, setTags] = useState<EntityDetailsTagItem[]>(() => initialTags.map(toTagItem));
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
      .map((entity): EntityDetailsTagItem => ({
        id: entity.id,
        name: entity.title,
        handle: "handle" in entity && typeof entity.handle === "string" ? entity.handle : null,
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
      message.success(newTags.length === 1 ? "Tag added to product" : "Tags added to product");
    } finally {
      setPendingTagId(null);
    }
  };

  const isPending = pendingTagId !== null;

  return (
    <EntityTagsSection
      tags={tags}
      isPending={isPending}
      onAdd={addTags}
      onDelete={deleteTag}
      testIdPrefix="product-tags"
      emptyDescription="Add tags to group products for filtering."
    />
  );
};
