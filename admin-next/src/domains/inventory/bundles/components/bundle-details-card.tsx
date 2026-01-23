"use client";

import { Flex } from "antd";
import { ProductInfoHeader } from "@/domains/inventory/products/components/product-info-header";
import { ProductContentTabs } from "@/domains/inventory/products/components/product-content-tabs";
import { SeoBlock } from "@/domains/inventory/products/components/seo";
import { AttributesSection } from "@/domains/inventory/products/components/attributes-section";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import {
  MediaSection,
  CategoriesSection,
  TagsSection,
} from "@/domains/inventory/products/components/product-details-card/sections";
import { ComponentsSection } from "./components-section";
import {
  useEditMediaModal,
  useEditAttributesModal,
  useEditSeoModal,
  useEditComponentsModal,
  type IEditSeoModalPayload,
} from "@/domains/inventory/products/modals";
import type { IProduct, IMediaFile } from "@/mocks/products/types";
import { useCallback } from "react";
import type { IBundleDetailsMockData } from "@/mocks/products/bundle-details";

interface IBundleDetailsCardProps {
  product: IProduct;
  mockData: IBundleDetailsMockData;
}

export const BundleDetailsCard = ({
  product,
  mockData,
}: IBundleDetailsCardProps) => {
  const { push: openEditMediaModal } = useEditMediaModal();
  const { push: openEditAttributesModal } = useEditAttributesModal();
  const { push: openEditSeoModal } = useEditSeoModal();
  const { push: openEditComponentsModal } = useEditComponentsModal();

  const handleEditMedia = useCallback(() => {
    openEditMediaModal({
      productId: product.id,
      featured: product.featured,
      gallery: product.gallery,
      onSave: (media: { featured: IMediaFile | null; gallery: IMediaFile[] }) => {
        console.log("Saved media:", media);
      },
    });
  }, [product.id, product.featured, product.gallery, openEditMediaModal]);

  const handleEditAttributes = useCallback(() => {
    openEditAttributesModal({ productId: product.id });
  }, [product.id, openEditAttributesModal]);

  const handleEditSeo = useCallback(() => {
    openEditSeoModal({
      productId: product.id,
      productTitle: product.title,
      productSlug: product.slug,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      onSave: (
        values: Parameters<NonNullable<IEditSeoModalPayload["onSave"]>>[0],
      ) => {
        console.log("Saved SEO:", values);
      },
    });
  }, [
    product.id,
    product.title,
    product.slug,
    product.seoTitle,
    product.seoDescription,
    openEditSeoModal,
  ]);

  const handleEditComponents = useCallback(() => {
    openEditComponentsModal({
      productId: product.id,
      groups: mockData.components,
    });
  }, [product.id, mockData.components, openEditComponentsModal]);

  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
      {/* BUNDLE INFO HEADER */}
      <ProductInfoHeader product={product} />

      {/* CONTENT TABS */}
      <ProductContentTabs product={product} />

      {/* MEDIA */}
      <MediaSection gallery={product.gallery} onEdit={handleEditMedia} />

      {/* COMPONENTS */}
      <ComponentsSection
        groups={mockData.components}
        onEdit={handleEditComponents}
      />

      {/* CATEGORIES */}
      <CategoriesSection
        primaryCategory={mockData.categories.primary}
        categories={mockData.categories.list}
      />

      {/* ATTRIBUTES */}
      <AttributesSection
        data={mockData.attributes}
        actions={
          <EditAction onEdit={handleEditAttributes} label="Edit attributes" />
        }
      />

      {/* TAGS */}
      <TagsSection tags={mockData.tags} />

      {/* SEO */}
      <SeoBlock
        data={{
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
          title: product.title,
          excerpt: product.excerpt,
          slug: product.slug,
        }}
        actions={<EditAction label="Edit SEO" onEdit={handleEditSeo} />}
      />
    </Flex>
  );
};
