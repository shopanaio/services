import { sql } from "drizzle-orm";
import { onlineStoreSchema } from "./schema.js";
import { pages, pageTranslations } from "./pages.js";

export const pageListView = onlineStoreSchema.view("page_list_view").as((qb) =>
  qb
    .select({
      installationId: pages.installationId,
      storeId: pages.storeId,
      id: pages.id,
      handle: pages.handle,
      templateSuffix: pages.templateSuffix,
      publishedAt: pages.publishedAt,
      isPublished:
        sql<boolean>`${pages.publishedAt} IS NOT NULL AND ${pages.publishedAt} <= now()`.as(
          "is_published",
        ),
      revision: pages.revision,
      createdAt: pages.createdAt,
      updatedAt: pages.updatedAt,
      deletedAt: pages.deletedAt,
      locale: pageTranslations.locale,
      title: pageTranslations.title,
    })
    .from(pages)
    .innerJoin(
      pageTranslations,
      sql`${pageTranslations.storeId} = ${pages.storeId} AND ${pageTranslations.pageId} = ${pages.id}`,
    ),
);

export type PageListView = typeof pageListView.$inferSelect;
