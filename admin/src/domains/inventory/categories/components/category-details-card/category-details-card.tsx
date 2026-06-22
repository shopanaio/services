"use client";

import { Flex } from "antd";
import { CategoryInfoHeader } from "../category-info-header";
import { CategoryContentTabs } from "../category-content-tabs";
import {
  HierarchySection,
  MediaSection,
  ProductsSection,
  SeoSection,
} from "./sections";
import { useCategoryModals } from "./hooks";
import type { CategoryDetailsCardProps } from "./types";

export const CategoryDetailsCard = ({
  category,
  onRefetch,
}: CategoryDetailsCardProps) => {
  const modals = useCategoryModals(category, onRefetch);
  const gallery = [...category.media]
    .sort((a, b) => a.sortIndex - b.sortIndex)
    .map((item) => item.file);

  return (
    <Flex
      vertical
      gap={12}
      style={{ width: "100%" }}
      data-testid="category-details-card"
    >
      <CategoryInfoHeader
        category={category}
        onEditIdentity={modals.editIdentity}
        onChangeStatus={modals.changeStatus}
        onEditSort={modals.editSort}
      />

      <CategoryContentTabs category={category} onEdit={modals.editContent} />

      <HierarchySection
        category={category}
        onEditParent={modals.editParent}
        onClearParent={modals.clearParent}
        onEditSubcategories={modals.editSubcategories}
        onRemoveSubcategory={modals.removeSubcategory}
      />

      <MediaSection gallery={gallery} onEdit={modals.editMedia} />

      <ProductsSection
        categoryId={category.id}
        productsCount={category.productsCount}
        defaultSort={category.defaultSort}
        defaultSortDirection={category.defaultSortDirection}
        onAssignProducts={modals.assignProducts}
      />

      <SeoSection category={category} onEdit={modals.editSeo} />
    </Flex>
  );
};
