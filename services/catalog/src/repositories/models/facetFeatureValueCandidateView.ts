import { sql } from "drizzle-orm";
import { text, uuid, varchar } from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";

export const facetFeatureValueCandidateView = catalogSchema
  .view("facet_feature_value_candidate_view", {
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
      'FEATURE:' || pf.slug || ':' || pfv.slug AS id,
      pf.project_id,
      pfvt.locale,
      'FEATURE'::text AS facet_type,
      pf.slug::text AS source_handle,
      (pf.slug || ':' || pfv.slug)::text AS handle,
      MIN(pfvt.name)::text AS label
    FROM catalog.product_feature pf
    INNER JOIN catalog.product_feature_translation pft
      ON pft.project_id = pf.project_id
     AND pft.feature_id = pf.id
    INNER JOIN catalog.product_feature_value pfv
      ON pfv.project_id = pf.project_id
     AND pfv.feature_id = pf.id
    INNER JOIN catalog.product_feature_value_translation pfvt
      ON pfvt.project_id = pfv.project_id
     AND pfvt.feature_value_id = pfv.id
     AND pfvt.locale = pft.locale
    WHERE pf.is_group = false
    GROUP BY pf.project_id, pfvt.locale, pf.slug, pfv.slug
  `);

export type FacetFeatureValueCandidateView =
  typeof facetFeatureValueCandidateView.$inferSelect;
