import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { productListingIndex } from "./listingIndex.js";
import { tsvector } from "./postgresTypes.js";
import { listingSchema, localeCodeEnum } from "./schema.js";

const uuidV7 = (column: unknown) =>
  sql`substring(${column}::text FROM 15 FOR 1) = '7'`;

export const productSearchText = listingSchema.table(
  "product_search_text",
  {
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    productDocId: integer("product_doc_id").notNull(),
    locale: localeCodeEnum("locale").notNull(),
    field: varchar("field", { length: 32 }).notNull(),
    elementId: uuid("element_id").notNull(),
    preparedText: text("prepared_text").notNull(),
    normalizationContractVersion: varchar("normalization_contract_version", {
      length: 32,
    }).notNull(),
    normalizationProfileRevision: varchar("normalization_profile_revision", {
      length: 64,
    }).notNull(),
    searchVector: tsvector("search_vector")
      .generatedAlwaysAs(
        sql`to_tsvector('pg_catalog.simple'::regconfig, prepared_text)`,
      ),
    indexedAt: timestamp("indexed_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.productId, table.locale, table.field, table.elementId],
    }),
    foreignKey({
      name: "fk_product_search_text_product",
      columns: [table.productDocId, table.productId],
      foreignColumns: [
        productListingIndex.productDocId,
        productListingIndex.productId,
      ],
    }).onDelete("cascade"),
    check(
      "chk_product_search_text_uuid_v7",
      sql`${uuidV7(table.storeId)} AND ${uuidV7(table.productId)} AND ${uuidV7(table.elementId)}`,
    ),
    check(
      "chk_product_search_text_product_doc_positive",
      sql`${table.productDocId} > 0`,
    ),
    check(
      "chk_product_search_text_field",
      sql`${table.field} IN ('product_title', 'variant_title', 'vendor_name', 'category_name')`,
    ),
    check(
      "chk_product_search_text_prepared_text",
      sql`${table.preparedText} <> '' AND char_length(${table.preparedText}) <= 8192`,
    ),
    check(
      "chk_product_search_text_contract",
      sql`${table.normalizationContractVersion} <> '' AND ${table.normalizationProfileRevision} <> ''`,
    ),
    index("product_search_text_store_vector_gin").using(
      "gin",
      table.storeId,
      table.searchVector,
    ),
    index("product_search_text_scope_idx").on(
      table.storeId,
      table.locale,
      table.normalizationContractVersion,
      table.normalizationProfileRevision,
      table.field,
    ),
    index("product_search_text_product_doc_idx").on(
      table.storeId,
      table.productDocId,
      table.locale,
    ),
  ],
);

export const productSearchIdentifier = listingSchema.table(
  "product_search_identifier",
  {
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    productDocId: integer("product_doc_id").notNull(),
    locale: localeCodeEnum("locale").notNull(),
    elementId: uuid("element_id").notNull(),
    kind: varchar("kind", { length: 16 }).notNull(),
    normalizedValue: text("normalized_value").notNull(),
    indexedAt: timestamp("indexed_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.productId, table.locale, table.kind, table.elementId],
    }),
    foreignKey({
      name: "fk_product_search_identifier_product",
      columns: [table.productDocId, table.productId],
      foreignColumns: [
        productListingIndex.productDocId,
        productListingIndex.productId,
      ],
    }).onDelete("cascade"),
    check(
      "chk_product_search_identifier_uuid_v7",
      sql`${uuidV7(table.storeId)} AND ${uuidV7(table.productId)} AND ${uuidV7(table.elementId)}`,
    ),
    check(
      "chk_product_search_identifier_product_doc_positive",
      sql`${table.productDocId} > 0`,
    ),
    check("chk_product_search_identifier_kind", sql`${table.kind} = 'SKU'`),
    check(
      "chk_product_search_identifier_value",
      sql`${table.normalizedValue} <> '' AND char_length(${table.normalizedValue}) <= 255`,
    ),
    index("product_search_identifier_exact_idx").on(
      table.storeId,
      table.locale,
      table.kind,
      table.normalizedValue,
      table.productId,
    ),
    index("product_search_identifier_prefix_idx").on(
      table.storeId,
      table.locale,
      table.kind,
      table.normalizedValue.asc().op("text_pattern_ops"),
      table.productId,
    ),
    index("product_search_identifier_product_doc_idx").on(
      table.storeId,
      table.productDocId,
      table.locale,
    ),
  ],
);

export const searchTermDictionary = listingSchema.table(
  "search_term_dictionary",
  {
    storeId: uuid("store_id").notNull(),
    locale: localeCodeEnum("locale").notNull(),
    term: text("term").notNull(),
    codePointLength: smallint("code_point_length").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("search_term_dictionary_store_locale_term_unique").on(
      table.storeId,
      table.locale,
      table.term,
    ),
    check("chk_search_term_dictionary_store_uuid_v7", uuidV7(table.storeId)),
    check(
      "chk_search_term_dictionary_term",
      sql`${table.term} <> '' AND char_length(${table.term}) <= 128`,
    ),
    check(
      "chk_search_term_dictionary_code_point_length",
      sql`${table.codePointLength} > 0 AND ${table.codePointLength} <= 128 AND ${table.codePointLength} = char_length(${table.term})`,
    ),
    index("search_term_dictionary_store_term_trgm_gin").using(
      "gin",
      table.storeId,
      table.term.asc().op("gin_trgm_ops"),
    ),
    index("search_term_dictionary_scope_idx").on(
      table.storeId,
      table.locale,
      table.codePointLength,
    ),
    index("search_term_dictionary_stale_idx").on(
      table.storeId,
      table.locale,
      table.lastSeenAt,
      table.term,
    ),
  ],
);

export const searchSettings = listingSchema.table(
  "search_settings",
  {
    storeId: uuid("store_id").notNull(),
    version: integer("version").notNull().default(1),
    enabledFields: jsonb("enabled_fields").notNull(),
    fieldWeights: jsonb("field_weights").notNull(),
    typoToleranceEnabled: boolean("typo_tolerance_enabled")
      .notNull()
      .default(false),
    outOfStockPolicy: varchar("out_of_stock_policy", { length: 16 })
      .notNull()
      .default("SHOW"),
    updatedBy: uuid("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("search_settings_store_unique").on(table.storeId),
    check(
      "chk_search_settings_uuid_v7",
      sql`${uuidV7(table.storeId)} AND ${uuidV7(table.updatedBy)}`,
    ),
    check("chk_search_settings_version", sql`${table.version} > 0`),
    check(
      "chk_search_settings_enabled_fields",
      sql`jsonb_typeof(${table.enabledFields}) = 'array'`,
    ),
    check(
      "chk_search_settings_field_weights",
      sql`jsonb_typeof(${table.fieldWeights}) = 'object'`,
    ),
    check(
      "chk_search_settings_oos_policy",
      sql`${table.outOfStockPolicy} IN ('SHOW', 'HIDE', 'PLACE_LAST')`,
    ),
  ],
);

export const searchSynonymGroup = listingSchema.table(
  "search_synonym_group",
  {
    storeId: uuid("store_id").notNull(),
    groupId: uuid("group_id").primaryKey(),
    locale: localeCodeEnum("locale").notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    version: integer("version").notNull().default(1),
    createdBy: uuid("created_by").notNull(),
    updatedBy: uuid("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("search_synonym_group_store_id_unique").on(
      table.storeId,
      table.groupId,
    ),
    unique("search_synonym_group_store_id_locale_unique").on(
      table.storeId,
      table.groupId,
      table.locale,
    ),
    unique("search_synonym_group_store_locale_name_unique").on(
      table.storeId,
      table.locale,
      table.name,
    ),
    check(
      "chk_search_synonym_group_uuid_v7",
      sql`${uuidV7(table.storeId)} AND ${uuidV7(table.groupId)} AND ${uuidV7(table.createdBy)} AND ${uuidV7(table.updatedBy)}`,
    ),
    check("chk_search_synonym_group_name", sql`${table.name} <> ''`),
    check("chk_search_synonym_group_version", sql`${table.version} > 0`),
    index("search_synonym_group_enabled_locale_idx")
      .on(table.storeId, table.locale, table.groupId)
      .where(sql`${table.enabled} = true`),
  ],
);

export const searchSynonymValue = listingSchema.table(
  "search_synonym_value",
  {
    storeId: uuid("store_id").notNull(),
    groupId: uuid("group_id").notNull(),
    valueId: uuid("value_id").primaryKey(),
    position: smallint("position").notNull(),
    displayValue: text("display_value").notNull(),
    normalizedValue: text("normalized_value").notNull(),
    preparedText: text("prepared_text").notNull(),
    normalizationContractVersion: varchar("normalization_contract_version", {
      length: 32,
    }).notNull(),
    normalizationProfileRevision: varchar("normalization_profile_revision", {
      length: 64,
    }).notNull(),
  },
  (table) => [
    unique("search_synonym_value_position_unique").on(
      table.storeId,
      table.groupId,
      table.position,
    ),
    unique("search_synonym_value_normalized_unique").on(
      table.storeId,
      table.groupId,
      table.normalizedValue,
    ),
    foreignKey({
      name: "fk_search_synonym_value_group",
      columns: [table.storeId, table.groupId],
      foreignColumns: [searchSynonymGroup.storeId, searchSynonymGroup.groupId],
    }).onDelete("cascade"),
    check(
      "chk_search_synonym_value_uuid_v7",
      sql`${uuidV7(table.storeId)} AND ${uuidV7(table.groupId)} AND ${uuidV7(table.valueId)}`,
    ),
    check(
      "chk_search_synonym_value_position",
      sql`${table.position} BETWEEN 1 AND 20`,
    ),
    check(
      "chk_search_synonym_value_lengths",
      sql`${table.displayValue} <> '' AND ${table.normalizedValue} <> '' AND ${table.preparedText} <> '' AND char_length(${table.displayValue}) <= 128 AND char_length(${table.normalizedValue}) <= 128 AND char_length(${table.preparedText}) <= 512`,
    ),
    check(
      "chk_search_synonym_value_contract",
      sql`${table.normalizationContractVersion} <> '' AND ${table.normalizationProfileRevision} <> ''`,
    ),
  ],
);

export const searchSynonymClaim = listingSchema.table(
  "search_synonym_claim",
  {
    storeId: uuid("store_id").notNull(),
    locale: localeCodeEnum("locale").notNull(),
    normalizedValue: text("normalized_value").notNull(),
    groupId: uuid("group_id").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.storeId, table.locale, table.normalizedValue],
      name: "search_synonym_claim_store_locale_value_pk",
    }),
    foreignKey({
      name: "fk_search_synonym_claim_group",
      columns: [table.storeId, table.groupId, table.locale],
      foreignColumns: [
        searchSynonymGroup.storeId,
        searchSynonymGroup.groupId,
        searchSynonymGroup.locale,
      ],
    }).onDelete("cascade"),
    check(
      "chk_search_synonym_claim_uuid_v7",
      sql`${uuidV7(table.storeId)} AND ${uuidV7(table.groupId)}`,
    ),
    check(
      "chk_search_synonym_claim_value",
      sql`${table.normalizedValue} <> '' AND char_length(${table.normalizedValue}) <= 128`,
    ),
  ],
);

export const searchProductBoost = listingSchema.table(
  "search_product_boost",
  {
    storeId: uuid("store_id").notNull(),
    boostId: uuid("boost_id").primaryKey(),
    locale: localeCodeEnum("locale").notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    version: integer("version").notNull().default(1),
    createdBy: uuid("created_by").notNull(),
    updatedBy: uuid("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("search_product_boost_store_locale_name_unique").on(
      table.storeId,
      table.locale,
      table.name,
    ),
    unique("search_product_boost_store_id_unique").on(
      table.storeId,
      table.boostId,
    ),
    check(
      "chk_search_product_boost_uuid_v7",
      sql`${uuidV7(table.storeId)} AND ${uuidV7(table.boostId)} AND ${uuidV7(table.createdBy)} AND ${uuidV7(table.updatedBy)}`,
    ),
    check("chk_search_product_boost_name", sql`${table.name} <> ''`),
    check("chk_search_product_boost_version", sql`${table.version} > 0`),
    index("search_product_boost_enabled_locale_idx")
      .on(table.storeId, table.locale, table.boostId)
      .where(sql`${table.enabled} = true`),
  ],
);

export const searchProductBoostPhrase = listingSchema.table(
  "search_product_boost_phrase",
  {
    storeId: uuid("store_id").notNull(),
    boostId: uuid("boost_id").notNull(),
    phraseId: uuid("phrase_id").primaryKey(),
    position: smallint("position").notNull(),
    displayPhrase: text("display_phrase").notNull(),
    normalizedPhrase: text("normalized_phrase").notNull(),
    normalizationContractVersion: varchar("normalization_contract_version", {
      length: 32,
    }).notNull(),
    normalizationProfileRevision: varchar("normalization_profile_revision", {
      length: 64,
    }).notNull(),
  },
  (table) => [
    unique("search_product_boost_phrase_position_unique").on(
      table.storeId,
      table.boostId,
      table.position,
    ),
    unique("search_product_boost_phrase_normalized_unique").on(
      table.storeId,
      table.boostId,
      table.normalizedPhrase,
    ),
    foreignKey({
      name: "fk_search_product_boost_phrase_boost",
      columns: [table.storeId, table.boostId],
      foreignColumns: [searchProductBoost.storeId, searchProductBoost.boostId],
    }).onDelete("cascade"),
    check(
      "chk_search_product_boost_phrase_uuid_v7",
      sql`${uuidV7(table.storeId)} AND ${uuidV7(table.boostId)} AND ${uuidV7(table.phraseId)}`,
    ),
    check(
      "chk_search_product_boost_phrase_position",
      sql`${table.position} BETWEEN 1 AND 20`,
    ),
    check(
      "chk_search_product_boost_phrase_lengths",
      sql`${table.displayPhrase} <> '' AND ${table.normalizedPhrase} <> '' AND char_length(${table.displayPhrase}) <= 128 AND char_length(${table.normalizedPhrase}) <= 128`,
    ),
    check(
      "chk_search_product_boost_phrase_contract",
      sql`${table.normalizationContractVersion} <> '' AND ${table.normalizationProfileRevision} <> ''`,
    ),
    index("search_product_boost_phrase_lookup_idx").on(
      table.storeId,
      table.normalizedPhrase,
      table.boostId,
    ),
  ],
);

export const searchProductBoostProduct = listingSchema.table(
  "search_product_boost_product",
  {
    storeId: uuid("store_id").notNull(),
    boostId: uuid("boost_id").notNull(),
    productId: uuid("product_id").notNull(),
    position: smallint("position").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.storeId, table.boostId, table.productId] }),
    unique("search_product_boost_product_position_unique").on(
      table.storeId,
      table.boostId,
      table.position,
    ),
    foreignKey({
      name: "fk_search_product_boost_product_boost",
      columns: [table.storeId, table.boostId],
      foreignColumns: [searchProductBoost.storeId, searchProductBoost.boostId],
    }).onDelete("cascade"),
    check(
      "chk_search_product_boost_product_uuid_v7",
      sql`${uuidV7(table.storeId)} AND ${uuidV7(table.boostId)} AND ${uuidV7(table.productId)}`,
    ),
    check(
      "chk_search_product_boost_product_position",
      sql`${table.position} BETWEEN 1 AND 50`,
    ),
  ],
);

export const searchConfigurationAudit = listingSchema.table(
  "search_configuration_audit",
  {
    storeId: uuid("store_id").notNull(),
    auditId: uuid("audit_id").primaryKey(),
    resourceVersion: integer("resource_version").notNull(),
    resourceType: varchar("resource_type", { length: 32 }).notNull(),
    resourceId: uuid("resource_id"),
    action: varchar("action", { length: 32 }).notNull(),
    beforeValue: jsonb("before_value"),
    afterValue: jsonb("after_value"),
    actorId: uuid("actor_id").notNull(),
    requestId: varchar("request_id", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "chk_search_configuration_audit_uuid_v7",
      sql`${uuidV7(table.storeId)} AND ${uuidV7(table.auditId)} AND (${table.resourceId} IS NULL OR ${uuidV7(table.resourceId)}) AND ${uuidV7(table.actorId)}`,
    ),
    check(
      "chk_search_configuration_audit_resource_version",
      sql`${table.resourceVersion} > 0`,
    ),
    check(
      "chk_search_configuration_audit_resource",
      sql`(${table.resourceType} = 'settings' AND ${table.resourceId} IS NULL) OR (${table.resourceType} IN ('synonym_group', 'product_boost') AND ${table.resourceId} IS NOT NULL)`,
    ),
    check(
      "chk_search_configuration_audit_action",
      sql`${table.action} IN ('create', 'update', 'delete')`,
    ),
    check(
      "chk_search_configuration_audit_values",
      sql`(${table.action} = 'create' AND ${table.beforeValue} IS NULL AND ${table.afterValue} IS NOT NULL) OR (${table.action} = 'update' AND ${table.beforeValue} IS NOT NULL AND ${table.afterValue} IS NOT NULL) OR (${table.action} = 'delete' AND ${table.beforeValue} IS NOT NULL AND ${table.afterValue} IS NULL)`,
    ),
    check(
      "chk_search_configuration_audit_request",
      sql`${table.requestId} <> ''`,
    ),
    index("search_configuration_audit_resource_idx").on(
      table.storeId,
      table.resourceType,
      table.resourceId,
      table.resourceVersion,
      table.createdAt,
      table.auditId,
    ),
  ],
);

export type ProductSearchText = typeof productSearchText.$inferSelect;
export type NewProductSearchText = typeof productSearchText.$inferInsert;
export type ProductSearchIdentifier =
  typeof productSearchIdentifier.$inferSelect;
export type NewProductSearchIdentifier =
  typeof productSearchIdentifier.$inferInsert;
export type SearchTermDictionary = typeof searchTermDictionary.$inferSelect;
export type NewSearchTermDictionary = typeof searchTermDictionary.$inferInsert;
export type SearchSettings = typeof searchSettings.$inferSelect;
export type NewSearchSettings = typeof searchSettings.$inferInsert;
export type SearchSynonymGroup = typeof searchSynonymGroup.$inferSelect;
export type NewSearchSynonymGroup = typeof searchSynonymGroup.$inferInsert;
export type SearchSynonymValue = typeof searchSynonymValue.$inferSelect;
export type NewSearchSynonymValue = typeof searchSynonymValue.$inferInsert;
export type SearchSynonymClaim = typeof searchSynonymClaim.$inferSelect;
export type NewSearchSynonymClaim = typeof searchSynonymClaim.$inferInsert;
export type SearchProductBoost = typeof searchProductBoost.$inferSelect;
export type NewSearchProductBoost = typeof searchProductBoost.$inferInsert;
export type SearchProductBoostPhrase =
  typeof searchProductBoostPhrase.$inferSelect;
export type NewSearchProductBoostPhrase =
  typeof searchProductBoostPhrase.$inferInsert;
export type SearchProductBoostProduct =
  typeof searchProductBoostProduct.$inferSelect;
export type NewSearchProductBoostProduct =
  typeof searchProductBoostProduct.$inferInsert;
export type SearchConfigurationAudit =
  typeof searchConfigurationAudit.$inferSelect;
export type NewSearchConfigurationAudit =
  typeof searchConfigurationAudit.$inferInsert;
