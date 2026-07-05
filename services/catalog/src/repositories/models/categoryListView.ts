import { sql } from "drizzle-orm";
import { catalogSchema } from "./schema";
import { category, categoryTranslation } from "./categories";

export const categoryListView = catalogSchema.view("category_list_view").as((qb) =>
  qb
    .select({
      storeId: category.storeId,
      id: category.id,
      parentId: category.parentId,
      path: category.path,
      depth: category.depth,
      handle: category.handle,
      defaultSort: category.defaultSort,
      defaultSortDirection: category.defaultSortDirection,
      publishedAt: category.publishedAt,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      deletedAt: category.deletedAt,
      revision: category.revision,
      productsCount: category.productsCount,
      locale: categoryTranslation.locale,
      name: categoryTranslation.name,
    })
    .from(category)
    .innerJoin(
      categoryTranslation,
      sql`${categoryTranslation.storeId} = ${category.storeId} AND ${categoryTranslation.categoryId} = ${category.id}`
    )
);
