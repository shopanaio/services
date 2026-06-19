"use client";

import { Flex } from "antd";
import { ProductInfoHeader } from "../product-info-header";
import { ProductContentTabs } from "../product-content-tabs";
import { ProductPricingSection } from "../pricing/product-pricing-section";
import { SeoBlock } from "../seo";
import { AttributesSection } from "../attributes-section";
import { EditAction } from "../edit-action";
import {
  MediaSection,
  CategoriesSection,
  TagsSection,
  ReviewsSection,
  OptionsSection,
  ShippingSection,
  BundlesSection,
  InventorySection,
  VariantsTableSection,
} from "./sections";
import { useProductModals } from "./hooks";
import type { ApiProduct } from "@/graphql/types";
import type { IVariantsTableData, ProductDetailsSupplementalData } from "./types";
import {
  getDefaultVariant,
  getProductMediaFiles,
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
  onProductRefresh?: () => Promise<unknown>;
}

export const ProductDetailsCard = ({
  product,
  supplementalData,
  variantsTableData,
  onEditSection,
  onVariantsPageChange,
  onProductRefresh,
}: IProductDetailsCardProps) => {
  const modals = useProductModals(product);
  const isVariableProduct = product.variantsCount > 1;
  const defaultVariant = getDefaultVariant(product);

  const handleEdit = (section: string) => onEditSection?.(section);

  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
      {/* PRODUCT INFORMATION */}
      <ProductInfoHeader product={product} />

      {/* CONTENT TABS */}
      <ProductContentTabs product={product} />

      {/* PRICING */}
      <ProductPricingSection
        product={product}
        onProductRefresh={onProductRefresh}
      />

      {/* MEDIA SECTION */}
      <MediaSection mediaFiles={getProductMediaFiles(product)} onEdit={modals.editMedia} />

      {/* INVENTORY */}
      <InventorySection
        onEdit={() => handleEdit("inventory")}
        product={product}
        stats={supplementalData.inventory}
      />

      {/* CATEGORIES & TAGS */}

      <CategoriesSection
        primaryCategory={product.categories[0] ?? null}
        categories={product.categories}
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
        data={supplementalData.attributes}
        actions={
          <EditAction onEdit={modals.editAttributes} label="Edit attributes" />
        }
      />

      {/* OPTIONS (variable products) */}
      {isVariableProduct && (
        <OptionsSection
          options={product.options}
          onEdit={modals.editOptions}
        />
      )}

      {/* VARIANTS TABLE (variable products) */}
      {isVariableProduct && variantsTableData && variantsTableData.variants.length > 0 && (
        <VariantsTableSection
          variants={variantsTableData.variants}
          productOptions={product.options}
          pageInfo={variantsTableData.pageInfo}
          totalCount={variantsTableData.totalCount}
          onEdit={modals.editVariants}
          onPageChange={onVariantsPageChange}
        />
      )}

      {/* SHIPPING */}
      {!isVariableProduct && (
        <ShippingSection
          variant={defaultVariant}
          onEdit={() => handleEdit("shipping")}
        />
      )}

      {/* BUNDLES CONTAINING THIS PRODUCT */}
      <BundlesSection bundles={supplementalData.includedInBundles} />

      <TagsSection tags={product.tags} />

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
