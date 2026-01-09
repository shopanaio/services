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
import type { IProduct } from "../../mocks/types";
import type { IVariantForTable, IProductDetailsMockData } from "./types";

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
  onEditSection?: (section: string) => void;
}

export const ProductDetailsCard = ({
  product,
  mockData,
  onEditSection,
}: IProductDetailsCardProps) => {
  const modals = useProductModals(product);

  const handleEdit = (section: string) => onEditSection?.(section);

  // Transform variants for table
  const variantsForTable: IVariantForTable[] =
    product.variants?.map((v) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      price: v.price,
      oldPrice: v.oldPrice,
      costPrice: v.costPrice,
      stockStatus: v.stockStatus,
      weight: v.weight,
      weightUnit: v.weightUnit,
      length: v.length,
      width: v.width,
      height: v.height,
      dimensionUnit: v.dimensionUnit,
      options: v.options?.map((opt) => ({
        title: opt.title,
        group: {
          slug: opt.group.slug,
          title: opt.group.title,
        },
      })),
      gallery: v.gallery,
    })) || [];

  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
      {/* PRODUCT INFORMATION */}
      <ProductInfoHeader
        product={product}
        onViewStorefront={() =>
          window.open(`/products/${product.slug}`, "_blank")
        }
        onPreview={() => console.log("Preview")}
        onShare={() => console.log("Share")}
      />

      {/* CONTENT TABS */}
      <ProductContentTabs product={product} />

      {/* PRICING */}
      <PricingBlock
        title="Pricing"
        price={product.price}
        compareAtPrice={product.oldPrice}
        costPrice={product.costPrice}
        variants={
          product.isVariableProduct
            ? product.variants?.map((v) => ({
                id: v.id,
                title:
                  v.options?.map((o) => o.title).join(" / ") || v.sku || v.id,
                price: v.price,
                compareAtPrice: v.oldPrice || null,
                costPrice: v.costPrice || null,
                options: v.options?.map((opt) => ({
                  title: opt.title,
                  group: {
                    slug: opt.group.slug,
                    title: opt.group.title,
                  },
                })),
              }))
            : undefined
        }
        priceSource="manual"
        targetMargin={35}
        onViewLog={() => console.log("View price log")}
        onMoreAction={(action) => console.log("Pricing action:", action)}
        formatPrice={formatPrice}
      />

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
      {product.isVariableProduct && variantsForTable.length > 0 && (
        <VariantsTableSection
          variants={variantsForTable}
          formatPrice={formatPrice}
          onEdit={modals.editVariants}
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
