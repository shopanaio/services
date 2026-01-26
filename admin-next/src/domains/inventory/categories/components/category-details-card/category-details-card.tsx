"use client";

import { Flex } from "antd";
import { CategoryInfoHeader } from "../category-info-header";
import { CategoryContentTabs } from "../category-content-tabs";
import { SeoBlock } from "@/domains/inventory/products/components/seo";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import {
  HierarchySection,
  MediaSection,
  ProductsSection,
  TagsSection,
} from "./sections";
import { useCategoryModals } from "./hooks";
import type { ICategoryDetailsCardProps } from "./types";

// ============================================================================
// Main Component
// ============================================================================

export const CategoryDetailsCard = ({
  category,
  mockData,
  onEditSection,
}: ICategoryDetailsCardProps) => {
  const modals = useCategoryModals(category);

  const handleEdit = (section: string) => onEditSection?.(section as never);

  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
      {/* CATEGORY INFO HEADER */}
      <CategoryInfoHeader category={category} />

      {/* CONTENT TABS */}
      <CategoryContentTabs category={category} />

      {/* HIERARCHY */}
      <HierarchySection
        ancestors={mockData.hierarchy.ancestors}
        children={mockData.hierarchy.children}
        categoryTitle={category.title}
        onEdit={modals.editHierarchy}
        onAddSubcategory={modals.addSubcategory}
      />

      {/* MEDIA SECTION */}
      <MediaSection gallery={category.gallery} onEdit={modals.editMedia} />

      {/* PRODUCTS */}
      <ProductsSection
        products={mockData.products.items}
        totalCount={mockData.products.totalCount}
        hasNextPage={mockData.products.hasNextPage}
        onAssignProducts={modals.openProductPicker}
      />

      {/* TAGS */}
      <TagsSection tags={mockData.tags} />

      {/* SEO */}
      <SeoBlock
        data={{
          seoTitle: category.seoTitle,
          seoDescription: category.seoDescription,
          title: category.title,
          excerpt: category.excerpt,
          slug: category.slug,
        }}
        actions={<EditAction label="Edit SEO" onEdit={modals.editSeo} />}
      />
    </Flex>
  );
};
