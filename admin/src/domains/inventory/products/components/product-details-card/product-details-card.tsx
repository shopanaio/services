"use client";

import { Flex } from "antd";
import { ProductInfoHeader } from "../product-info-header";
import { ProductContentTabs } from "../product-content-tabs";
import { PricingBlock } from "../pricing/pricing-block";
import { SeoBlock } from "../seo";
import { AttributesSection } from "../attributes-section";
import { EditAction } from "../edit-action";
import { useDefaultCurrency } from "@/domains/workspace";
import {
  MediaSection,
  CategoriesSection,
  TagsSection,
  ReviewsSection,
  OptionsSection,
  BundlesSection,
  InventorySection,
  VariantsTableSection,
} from "./sections";
import { useProductModals } from "./hooks";
import type { ApiProduct } from "@/graphql/types";
import type { IVariantsTableData, ProductDetailsSupplementalData } from "./types";
import {
  getProductCategories,
  getProductMediaFiles,
  getProductPrimaryCategory,
} from "../../utils/api-product-display";

// ============================================================================
// Main Component
// ============================================================================

interface IProductDetailsCardProps {
  product: ApiProduct;
  supplementalData: ProductDetailsSupplementalData;
  variantsTableData?: IVariantsTableData;
  onEditSection?: (section: string) => void;
  onVariantsPageChange?: (direction: "next" | "prev") => void;
  isVariantsPageLoading?: boolean;
  onProductRefresh?: () => Promise<unknown>;
}

export const ProductDetailsCard = ({
  product,
  supplementalData,
  variantsTableData,
  onEditSection,
  onVariantsPageChange,
  isVariantsPageLoading = false,
  onProductRefresh,
}: IProductDetailsCardProps) => {
  const defaultCurrency = useDefaultCurrency();
  const modals = useProductModals(product, {
    onProductRefresh,
    defaultCurrency,
  });
  const shouldRenderVariantsSection =
    !!variantsTableData &&
    (variantsTableData.totalCount > 0 || product.variantsCount > 0);

  const handleEdit = (section: string) => onEditSection?.(section);

  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
      {/* PRODUCT INFORMATION */}
      <ProductInfoHeader product={product} onProductRefresh={onProductRefresh} />

      {/* CONTENT TABS */}
      <ProductContentTabs product={product} />

      {/* PRICING */}
      <PricingBlock
        product={product}
        onProductRefresh={onProductRefresh}
      />

      {/* MEDIA SECTION */}
      <MediaSection mediaFiles={getProductMediaFiles(product)} onEdit={modals.editMedia} />

      {/* INVENTORY */}
      <InventorySection
        onEdit={() => handleEdit("inventory")}
        product={product}
        onProductRefresh={onProductRefresh}
      />

      {/* CATEGORIES & TAGS */}

      <CategoriesSection
        productId={product.id}
        primaryCategory={getProductPrimaryCategory(product)}
        categories={getProductCategories(product)}
        onProductRefresh={onProductRefresh}
      />

      {/* REVIEWS */}
      <ReviewsSection
        rating={supplementalData.reviews.rating}
        reviewsCount={supplementalData.reviews.reviewsCount}
        breakdown={supplementalData.reviews.breakdown}
        onEdit={() => handleEdit("reviews")}
      />

      {/* ATTRIBUTES */}
      <AttributesSection
        features={product.features}
        actions={
          <EditAction
            onEdit={modals.editAttributes}
            label="Edit attributes"
            testId="product-attributes-actions-button"
          />
        }
      />

      {/* OPTIONS */}
      <OptionsSection
        options={product.options}
        actions={
          <EditAction
            onEdit={modals.editOptions}
            label="Edit options"
            testId="product-options-actions-button"
          />
        }
      />

      {/* VARIANTS TABLE */}
      {shouldRenderVariantsSection && variantsTableData && (
        <VariantsTableSection
          variants={variantsTableData.variants}
          productOptions={product.options}
          pageInfo={variantsTableData.pageInfo}
          totalCount={variantsTableData.totalCount}
          defaultCurrency={defaultCurrency}
          onEdit={modals.editVariants}
          isEditLoading={modals.isEditVariantsLoading}
          isPageLoading={isVariantsPageLoading}
          onPageChange={onVariantsPageChange}
        />
      )}

      {/* BUNDLES CONTAINING THIS PRODUCT */}
      <BundlesSection bundles={supplementalData.includedInBundles} />

      <TagsSection
        productId={product.id}
        productRevision={product.revision}
        tags={product.tags}
        onProductRefresh={onProductRefresh}
      />

      {/* SEO */}
      <SeoBlock
        data={{
          seoTitle: product.seo?.seoTitle ?? null,
          seoDescription: product.seo?.seoDescription ?? null,
          ogTitle: product.seo?.ogTitle ?? null,
          ogDescription: product.seo?.ogDescription ?? null,
          ogImage: product.seo?.ogImage ?? null,
          title: product.title,
          excerpt: product.excerpt?.text ?? null,
          slug: product.handle ?? product.id,
        }}
        actions={
          <EditAction
            label="Edit SEO"
            onEdit={modals.editSeo}
            testId="product-seo-actions-button"
          />
        }
      />
    </Flex>
  );
};
