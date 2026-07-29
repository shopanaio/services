"use client";

import { useEffect, useState } from "react";
import { App } from "antd";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import {
  EntityTagsSection,
  type EntityDetailsTagItem,
} from "@/domains/inventory/components/entity-details-sections";
import type { ApiDiscount } from "@/graphql/types";
import { useUpdateDiscount } from "@/domains/inventory/discounts/hooks";
import { useDiscountSectionStyles } from "../discount-details-card.styles";

interface DiscountTagsSectionProps {
  discount: ApiDiscount;
  onRefresh?: () => Promise<unknown>;
}

const toTagItem = (name: string): EntityDetailsTagItem => ({
  id: name,
  name,
  handle: name,
});

export function DiscountTagsSection({
  discount,
  onRefresh,
}: DiscountTagsSectionProps) {
  const { message } = App.useApp();
  const { styles } = useDiscountSectionStyles();
  const { updateDiscount } = useUpdateDiscount();
  const [pendingTagId, setPendingTagId] = useState<string | null>(null);
  const [tags, setTags] = useState<EntityDetailsTagItem[]>(() =>
    discount.tags.map(toTagItem),
  );
  const sourceTagsKey = discount.tags.join("|");

  useEffect(() => {
    setTags(discount.tags.map(toTagItem));
  }, [sourceTagsKey]);

  const saveTags = async (nextTags: EntityDetailsTagItem[]) => {
    const result = await updateDiscount({
      discountId: discount.id,
      expectedRevision: discount.revision,
      operations: {
        tags: nextTags.map((tag) => tag.name),
      },
    });

    if (result.errors.length > 0) {
      message.error(result.errors[0].message);
      return false;
    }

    return true;
  };

  const refreshDiscount = async () => {
    try {
      await onRefresh?.();
    } catch {
      message.warning("Tag changes saved, but discount refresh failed");
    }
  };

  const deleteTag = async (id: string) => {
    const nextTags = tags.filter((tag) => tag.id !== id);
    setPendingTagId(id);

    try {
      if (!(await saveTags(nextTags))) {
        return;
      }

      setTags(nextTags);
      await refreshDiscount();
      message.success("Tag removed from discount");
    } finally {
      setPendingTagId(null);
    }
  };

  const addTags = async (entities: IPickableEntity[]) => {
    const existingNames = new Set(
      tags.map((tag) => tag.name.trim().toLocaleLowerCase()),
    );
    const newTags = entities
      .filter(
        (entity) =>
          !existingNames.has(entity.title.trim().toLocaleLowerCase()),
      )
      .map(
        (entity): EntityDetailsTagItem => ({
          id: entity.id,
          name: entity.title,
        }),
      );

    if (newTags.length === 0) {
      return;
    }

    const nextTags = [...tags, ...newTags];
    setPendingTagId(newTags[0].id);

    try {
      if (!(await saveTags(nextTags))) {
        return;
      }

      setTags(nextTags);
      await refreshDiscount();
      message.success(
        newTags.length === 1
          ? "Tag added to discount"
          : "Tags added to discount",
      );
    } finally {
      setPendingTagId(null);
    }
  };

  return (
    <EntityTagsSection
      tags={tags}
      isPending={pendingTagId !== null}
      onAdd={addTags}
      onDelete={deleteTag}
      testIdPrefix="discount-tags"
      emptyDescription="Add tags to organize discounts for filtering and reporting."
      className={styles.section}
      headerClassName={styles.compactHeader}
    />
  );
}
