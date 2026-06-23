import { sql } from "drizzle-orm";
import { catalogSchema } from "./schema";
import { categoryTranslation, productCategory } from "./categories";
import { product } from "./products";
import { productTranslation } from "./translations";

export const productListView = catalogSchema.view("product_list_view").as((qb) =>
  qb
    .select({
      projectId: product.projectId,
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
      primaryCategoryId: sql<string>`${productCategory.categoryId}`.as("primary_category_id"),
      primaryCategoryName: sql<string>`${categoryTranslation.name}`.as("primary_category_name"),
    })
    .from(product)
    .innerJoin(
      productTranslation,
      sql`${productTranslation.projectId} = ${product.projectId} AND ${productTranslation.productId} = ${product.id}`
    )
    .leftJoin(
      productCategory,
      sql`${productCategory.projectId} = ${product.projectId} AND ${productCategory.productId} = ${product.id} AND ${productCategory.isPrimary} = true`
    )
    .leftJoin(
      categoryTranslation,
      sql`${categoryTranslation.projectId} = ${product.projectId} AND ${categoryTranslation.categoryId} = ${productCategory.categoryId} AND ${categoryTranslation.locale} = ${productTranslation.locale}`
    )
);
