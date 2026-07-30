import { sql } from "drizzle-orm";
import { catalogSchema } from "./schema";
import { categoryTranslation, productCategory } from "./categories";
import { productPriceRange } from "./pricing";
import { product, productRegistry } from "./products";
import { productTranslation } from "./translations";
import { vendor } from "./vendors";

export const listingListView = catalogSchema.view("listing_list_view").as((qb) =>
  qb
    .select({
      storeId: productRegistry.storeId,
      id: productRegistry.id,
      vendorId: product.vendorId,
      handle: productRegistry.handle,
      publishedAt: productRegistry.publishedAt,
      createdAt: productRegistry.createdAt,
      updatedAt: productRegistry.updatedAt,
      deletedAt: productRegistry.deletedAt,
      revision: productRegistry.revision,
      locale: productTranslation.locale,
      name: productTranslation.name,
      currency: productPriceRange.currency,
      minAmountMinor: sql<number>`${productPriceRange.minAmountMinor}`.as("min_amount_minor"),
      maxAmountMinor: sql<number>`${productPriceRange.maxAmountMinor}`.as("max_amount_minor"),
      minPriceMinor: sql<number>`${productPriceRange.minAmountMinor}`.as("min_price_minor"),
      maxPriceMinor: sql<number>`${productPriceRange.maxAmountMinor}`.as("max_price_minor"),
      primaryCategoryId: sql<string>`${productCategory.categoryId}`.as("primary_category_id"),
      primaryCategoryName: sql<string>`${categoryTranslation.name}`.as("primary_category_name"),
      brandName: sql<string>`${vendor.name}`.as("brand_name"),
    })
    .from(productRegistry)
    .innerJoin(product, sql`${product.id} = ${productRegistry.id}`)
    .innerJoin(
      productTranslation,
      sql`${productTranslation.storeId} = ${productRegistry.storeId} AND ${productTranslation.productId} = ${productRegistry.id}`
    )
    .leftJoin(
      productPriceRange,
      sql`${productPriceRange.storeId} = ${productRegistry.storeId} AND ${productPriceRange.productId} = ${productRegistry.id}`
    )
    .leftJoin(
      productCategory,
      sql`${productCategory.storeId} = ${productRegistry.storeId} AND ${productCategory.productId} = ${productRegistry.id} AND ${productCategory.isPrimary} = true`
    )
    .leftJoin(
      categoryTranslation,
      sql`${categoryTranslation.storeId} = ${productRegistry.storeId} AND ${categoryTranslation.categoryId} = ${productCategory.categoryId} AND ${categoryTranslation.locale} = ${productTranslation.locale}`
    )
    .leftJoin(
      vendor,
      sql`${vendor.storeId} = ${productRegistry.storeId} AND ${vendor.id} = ${product.vendorId}`
    )
);

export const productListView = catalogSchema.view("product_list_view").as((qb) =>
  qb
    .select({
      storeId: productRegistry.storeId,
      id: productRegistry.id,
      vendorId: product.vendorId,
      handle: productRegistry.handle,
      publishedAt: productRegistry.publishedAt,
      createdAt: productRegistry.createdAt,
      updatedAt: productRegistry.updatedAt,
      deletedAt: productRegistry.deletedAt,
      revision: productRegistry.revision,
      locale: productTranslation.locale,
      name: productTranslation.name,
      currency: productPriceRange.currency,
      minAmountMinor: sql<number>`${productPriceRange.minAmountMinor}`.as("min_amount_minor"),
      maxAmountMinor: sql<number>`${productPriceRange.maxAmountMinor}`.as("max_amount_minor"),
      minPriceMinor: sql<number>`${productPriceRange.minAmountMinor}`.as("min_price_minor"),
      maxPriceMinor: sql<number>`${productPriceRange.maxAmountMinor}`.as("max_price_minor"),
      primaryCategoryId: sql<string>`${productCategory.categoryId}`.as("primary_category_id"),
      primaryCategoryName: sql<string>`${categoryTranslation.name}`.as("primary_category_name"),
      brandName: sql<string>`${vendor.name}`.as("brand_name"),
    })
    .from(productRegistry)
    .innerJoin(product, sql`${product.id} = ${productRegistry.id}`)
    .innerJoin(
      productTranslation,
      sql`${productTranslation.storeId} = ${productRegistry.storeId} AND ${productTranslation.productId} = ${productRegistry.id}`
    )
    .leftJoin(
      productPriceRange,
      sql`${productPriceRange.storeId} = ${productRegistry.storeId} AND ${productPriceRange.productId} = ${productRegistry.id}`
    )
    .leftJoin(
      productCategory,
      sql`${productCategory.storeId} = ${productRegistry.storeId} AND ${productCategory.productId} = ${productRegistry.id} AND ${productCategory.isPrimary} = true`
    )
    .leftJoin(
      categoryTranslation,
      sql`${categoryTranslation.storeId} = ${productRegistry.storeId} AND ${categoryTranslation.categoryId} = ${productCategory.categoryId} AND ${categoryTranslation.locale} = ${productTranslation.locale}`
    )
    .leftJoin(
      vendor,
      sql`${vendor.storeId} = ${productRegistry.storeId} AND ${vendor.id} = ${product.vendorId}`
    )
);

export type ProductListView = typeof productListView.$inferSelect;
export type ListingListView = typeof listingListView.$inferSelect;
