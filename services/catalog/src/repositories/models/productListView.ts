import { sql } from "drizzle-orm";
import { catalogSchema } from "./schema";
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
    })
    .from(product)
    .innerJoin(
      productTranslation,
      sql`${productTranslation.projectId} = ${product.projectId} AND ${productTranslation.productId} = ${product.id}`
    )
);
