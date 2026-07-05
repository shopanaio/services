import { sql } from "drizzle-orm";
import { text, uuid, varchar } from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";

export const facetOptionValueCandidateView = catalogSchema
  .view("facet_option_value_candidate_view", {
    id: text("id").notNull(),
    storeId: uuid("store_id").notNull(),
    locale: varchar("locale", { length: 8 }).notNull(),
    facetType: varchar("facet_type", { length: 32 }).notNull(),
    sourceHandle: text("source_handle").notNull(),
    handle: text("handle").notNull(),
    label: text("label").notNull(),
  })
  .as(sql`
    SELECT
      'OPTION:' || po.slug || ':' || pov.slug AS id,
      po.store_id,
      povt.locale,
      'OPTION'::text AS facet_type,
      po.slug::text AS source_handle,
      (po.slug || ':' || pov.slug)::text AS handle,
      MIN(povt.name)::text AS label
    FROM catalog.product_option po
    INNER JOIN catalog.product_option_translation pot
      ON pot.store_id = po.store_id
     AND pot.option_id = po.id
    INNER JOIN catalog.product_option_value pov
      ON pov.store_id = po.store_id
     AND pov.option_id = po.id
    INNER JOIN catalog.product_option_value_translation povt
      ON povt.store_id = pov.store_id
     AND povt.option_value_id = pov.id
     AND povt.locale = pot.locale
    GROUP BY po.store_id, povt.locale, po.slug, pov.slug
  `);

export type FacetOptionValueCandidateView =
  typeof facetOptionValueCandidateView.$inferSelect;
