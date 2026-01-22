"use client";

import { Flex } from "antd";
import { ProductInfoHeader } from "../product-info-header";
import { ProductContentTabs } from "../product-content-tabs";
import { PricingBlock } from "../pricing/pricing-block";
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
  ComponentsSection,
  InventorySection,
  VariantsTableSection,
} from "./sections";
import { useProductModals } from "./hooks";
import type { IProduct } from "@/mocks/products/types";
import type { IVariantsTableData, IProductDetailsMockData } from "./types";

// ============================================================================
// Helpers
// ============================================================================

const formatPrice = (price: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
  }).format(price / 100);

// ============================================================================
// Main Component
// ============================================================================

interface IProductDetailsCardProps {
  product: IProduct;
  mockData: IProductDetailsMockData;
  variantsTableData?: IVariantsTableData;
  onEditSection?: (section: string) => void;
  onVariantsPageChange?: (direction: "next" | "prev") => void;
}

export const ProductDetailsCard = ({
  product,
  mockData,
  variantsTableData,
  onEditSection,
  onVariantsPageChange,
}: IProductDetailsCardProps) => {
  const modals = useProductModals(product, {
    components: mockData.components,
    pricingTemplates: mockData.pricingTemplates,
    tieredDiscounts: mockData.tieredDiscounts,
    dependencyRules: mockData.dependencyRules,
  });

  const handleEdit = (section: string) => onEditSection?.(section);

  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
      {/* PRODUCT INFORMATION */}
      <ProductInfoHeader product={product} />

      {/* CONTENT TABS */}
      <ProductContentTabs product={product} />

      {/* PRICING */}
      <PricingBlock productId={product.id} formatPrice={formatPrice} />

      {/* MEDIA SECTION */}
      <MediaSection gallery={product.gallery} onEdit={modals.editMedia} />

      {/* INVENTORY */}
      <InventorySection
        onEdit={() => handleEdit("inventory")}
        product={product}
        stats={mockData.inventory}
      />

      {/* CATEGORIES & TAGS */}

      <CategoriesSection
        primaryCategory={mockData.categories.primary}
        categories={mockData.categories.list}
      />

      {/* REVIEWS */}
      <ReviewsSection
        rating={mockData.reviews.rating}
        reviewsCount={mockData.reviews.reviewsCount}
        breakdown={mockData.reviews.breakdown}
        onEdit={() => handleEdit("reviews")}
      />

      {/* ATTRIBUTES */}
      <AttributesSection
        data={mockData.attributes}
        actions={
          <EditAction onEdit={modals.editAttributes} label="Edit attributes" />
        }
      />

      {/* OPTIONS (variable products) */}
      {product.isVariableProduct && (
        <OptionsSection
          options={mockData.options}
          onEdit={modals.editOptions}
        />
      )}

      {/* VARIANTS TABLE (variable products) */}
      {product.isVariableProduct && variantsTableData && variantsTableData.variants.length > 0 && (
        <VariantsTableSection
          variants={variantsTableData.variants}
          pageInfo={variantsTableData.pageInfo}
          totalCount={variantsTableData.totalCount}
          formatPrice={formatPrice}
          onEdit={modals.editVariants}
          onPageChange={onVariantsPageChange}
        />
      )}

      {/* SHIPPING */}
      {!product.isVariableProduct && (
        <ShippingSection
          weight={product.weight}
          weightUnit={product.weightUnit}
          length={product.length}
          width={product.width}
          height={product.height}
          dimensionUnit={product.dimensionUnit}
          requiresShipping={product.requiresShipping}
          onEdit={() => handleEdit("shipping")}
        />
      )}

      {/* GROUPS/COMPONENTS */}
      <ComponentsSection
        groups={mockData.components}
        onEdit={modals.editComponents}
      />

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
        actions={<EditAction label="Edit SEO" onEdit={modals.editSeo} />}
      />
    </Flex>
  );
};
