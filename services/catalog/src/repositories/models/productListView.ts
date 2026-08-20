import { sql } from "drizzle-orm";
import { catalogSchema } from "./schema";
import { categoryTranslation, productCategory } from "./categories";
import { productPriceRange } from "./pricing";
import { product } from "./products";
import { productTranslation } from "./translations";
import { vendor } from "./vendors";

export const listingListView = catalogSchema.view("listing_list_view").as((qb) =>
  qb
    .select({
      storeId: product.storeId,
      id: product.id,
      vendorId: product.vendorId,
      handle: product.handle,
      publishedAt: product.publishedAt,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
      revision: product.revision,
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
    .from(product)
    .innerJoin(
      productTranslation,
      sql`${productTranslation.storeId} = ${product.storeId} AND ${productTranslation.productId} = ${product.id}`,
    )
    .leftJoin(
      productPriceRange,
      sql`${productPriceRange.storeId} = ${product.storeId} AND ${productPriceRange.productId} = ${product.id}`,
    )
    .leftJoin(
      productCategory,
      sql`${productCategory.storeId} = ${product.storeId} AND ${productCategory.productId} = ${product.id} AND ${productCategory.isPrimary} = true`,
    )
    .leftJoin(
      categoryTranslation,
      sql`${categoryTranslation.storeId} = ${product.storeId} AND ${categoryTranslation.categoryId} = ${productCategory.categoryId} AND ${categoryTranslation.locale} = ${productTranslation.locale}`,
    )
    .leftJoin(
      vendor,
      sql`${vendor.storeId} = ${product.storeId} AND ${vendor.id} = ${product.vendorId}`,
    ),
);

export const productListView = catalogSchema.view("product_list_view").as((qb) =>
  qb
    .select({
      storeId: product.storeId,
      id: product.id,
      vendorId: product.vendorId,
      handle: product.handle,
      publishedAt: product.publishedAt,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
      revision: product.revision,
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
    .from(product)
    .innerJoin(
      productTranslation,
      sql`${productTranslation.storeId} = ${product.storeId} AND ${productTranslation.productId} = ${product.id}`,
    )
    .leftJoin(
      productPriceRange,
      sql`${productPriceRange.storeId} = ${product.storeId} AND ${productPriceRange.productId} = ${product.id}`,
    )
    .leftJoin(
      productCategory,
      sql`${productCategory.storeId} = ${product.storeId} AND ${productCategory.productId} = ${product.id} AND ${productCategory.isPrimary} = true`,
    )
    .leftJoin(
      categoryTranslation,
      sql`${categoryTranslation.storeId} = ${product.storeId} AND ${categoryTranslation.categoryId} = ${productCategory.categoryId} AND ${categoryTranslation.locale} = ${productTranslation.locale}`,
    )
    .leftJoin(
      vendor,
      sql`${vendor.storeId} = ${product.storeId} AND ${vendor.id} = ${product.vendorId}`,
    ),
);

export type ProductListView = typeof productListView.$inferSelect;
export type ListingListView = typeof listingListView.$inferSelect;
