import { sql } from "drizzle-orm";
import { text, uuid, varchar } from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";

export const facetTagValueCandidateView = catalogSchema
  .view("facet_tag_value_candidate_view", {
    id: text("id").notNull(),
    projectId: uuid("project_id").notNull(),
    locale: varchar("locale", { length: 8 }).notNull(),
    facetType: varchar("facet_type", { length: 32 }).notNull(),
    sourceHandle: text("source_handle").notNull(),
    handle: text("handle").notNull(),
    label: text("label").notNull(),
  })
  .as(sql`
    SELECT
      'TAG:' || t.handle AS id,
      t.project_id,
      tt.locale,
      'TAG'::text AS facet_type,
      'tags'::text AS source_handle,
      t.handle::text AS handle,
      tt.name::text AS label
    FROM catalog.tag t
    INNER JOIN catalog.tag_translation tt
      ON tt.project_id = t.project_id
     AND tt.tag_id = t.id
  `);

export type FacetTagValueCandidateView =
  typeof facetTagValueCandidateView.$inferSelect;
