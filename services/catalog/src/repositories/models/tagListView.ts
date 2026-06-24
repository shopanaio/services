import { sql } from "drizzle-orm";
import { catalogSchema } from "./schema";
import { tag, tagTranslation } from "./tags";

export const tagListView = catalogSchema.view("tag_list_view").as((qb) =>
  qb
    .select({
      projectId: tag.projectId,
      id: tag.id,
      handle: tag.handle,
      createdAt: tag.createdAt,
      productsCount: tag.productsCount,
      locale: tagTranslation.locale,
      name: tagTranslation.name,
    })
    .from(tag)
    .innerJoin(
      tagTranslation,
      sql`${tagTranslation.projectId} = ${tag.projectId} AND ${tagTranslation.tagId} = ${tag.id}`
    )
);
