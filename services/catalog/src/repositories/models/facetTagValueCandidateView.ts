import { sql } from "drizzle-orm";
import { text, uuid, varchar } from "drizzle-orm/pg-core";
import { catalogSchema, localeCodeEnum } from "./schema";

export const facetTagValueCandidateView = catalogSchema.view("facet_tag_value_candidate_view", {
  id: text("id").notNull(),
  storeId: uuid("store_id").notNull(),
  locale: localeCodeEnum("locale").notNull(),
  facetType: varchar("facet_type", { length: 32 }).notNull(),
  sourceHandle: text("source_handle").notNull(),
  handle: text("handle").notNull(),
  label: text("label").notNull(),
}).as(sql`
    SELECT
      'TAG:' || t.handle AS id,
      t.store_id,
      tt.locale,
      'TAG'::text AS facet_type,
      'tags'::text AS source_handle,
      t.handle::text AS handle,
      tt.name::text AS label
    FROM catalog.tag t
    INNER JOIN catalog.tag_translation tt
      ON tt.store_id = t.store_id
     AND tt.tag_id = t.id
  `);

export type FacetTagValueCandidateView = typeof facetTagValueCandidateView.$inferSelect;
