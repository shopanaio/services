import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { category } from "./categories";
import { productFeature, productFeatureValue } from "./features";
import { productOption, productOptionValue } from "./options";
import { product } from "./products";
import {
  catalogSchema,
  comparisonCardinalityEnum,
  comparisonValueTypeEnum,
  localeCodeEnum,
} from "./schema";

export const comparisonProfile = catalogSchema.table(
  "comparison_profile",
  {
    storeId: uuid("store_id").notNull(),
    id: uuid("id").primaryKey(),
    handle: varchar("handle", { length: 255 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    revision: integer("revision").notNull().default(0),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("comparison_profile_store_id_handle_uniq").on(
      table.storeId,
      table.handle,
    ),
    index("idx_comparison_profile_store_enabled").on(
      table.storeId,
      table.enabled,
    ),
    index("idx_comparison_profile_id_revision").on(table.id, table.revision),
  ],
);

export const comparisonGroup = catalogSchema.table(
  "comparison_group",
  {
    storeId: uuid("store_id").notNull(),
    id: uuid("id").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => comparisonProfile.id, { onDelete: "cascade" }),
    handle: varchar("handle", { length: 255 }).notNull(),
    sortIndex: integer("sort_index").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("comparison_group_profile_id_handle_uniq").on(
      table.profileId,
      table.handle,
    ),
    unique("comparison_group_profile_id_sort_index_uniq").on(
      table.profileId,
      table.sortIndex,
    ),
    unique("comparison_group_profile_id_id_uniq").on(
      table.profileId,
      table.id,
    ),
    index("idx_comparison_group_store_id").on(table.storeId),
    index("idx_comparison_group_store_profile").on(
      table.storeId,
      table.profileId,
    ),
    index("idx_comparison_group_profile_sort").on(
      table.profileId,
      table.sortIndex,
    ),
  ],
);

export const comparisonField = catalogSchema.table(
  "comparison_field",
  {
    storeId: uuid("store_id").notNull(),
    id: uuid("id").primaryKey(),
    profileId: uuid("profile_id").notNull(),
    groupId: uuid("group_id").notNull(),
    handle: varchar("handle", { length: 255 }).notNull(),
    valueType: comparisonValueTypeEnum("value_type").notNull(),
    cardinality: comparisonCardinalityEnum("cardinality")
      .notNull()
      .default("SINGLE"),
    canonicalUnit: varchar("canonical_unit", { length: 32 }),
    sortIndex: integer("sort_index").notNull(),
    featured: boolean("featured").notNull().default(false),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "comparison_field_profile_group_fk",
      columns: [table.profileId, table.groupId],
      foreignColumns: [comparisonGroup.profileId, comparisonGroup.id],
    }).onDelete("cascade"),
    unique("comparison_field_profile_id_handle_uniq").on(
      table.profileId,
      table.handle,
    ),
    unique("comparison_field_group_id_sort_index_uniq").on(
      table.groupId,
      table.sortIndex,
    ),
    unique("comparison_field_profile_id_id_uniq").on(
      table.profileId,
      table.id,
    ),
    unique("comparison_field_id_value_type_uniq").on(
      table.id,
      table.valueType,
    ),
    check(
      "comparison_field_canonical_unit_shape_check",
      sql`${table.canonicalUnit} IS NULL OR (
        ${table.valueType} IN ('DECIMAL', 'INTEGER')
        AND ${table.canonicalUnit} = btrim(${table.canonicalUnit})
        AND length(${table.canonicalUnit}) > 0
      )`,
    ),
    index("idx_comparison_field_store_id").on(table.storeId),
    index("idx_comparison_field_profile_sort").on(
      table.profileId,
      table.groupId,
      table.sortIndex,
    ),
    index("idx_comparison_field_profile_featured").on(
      table.profileId,
      table.featured,
      table.sortIndex,
    ),
  ],
);

export const comparisonFieldOption = catalogSchema.table(
  "comparison_field_option",
  {
    storeId: uuid("store_id").notNull(),
    id: uuid("id").primaryKey(),
    fieldId: uuid("field_id").notNull(),
    valueType: comparisonValueTypeEnum("value_type")
      .notNull()
      .default("ENUM"),
    handle: varchar("handle", { length: 255 }).notNull(),
    sortIndex: integer("sort_index").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "comparison_field_option_enum_field_fk",
      columns: [table.fieldId, table.valueType],
      foreignColumns: [comparisonField.id, comparisonField.valueType],
    }).onDelete("cascade"),
    check(
      "comparison_field_option_enum_only_check",
      sql`${table.valueType} = 'ENUM'`,
    ),
    unique("comparison_field_option_field_id_handle_uniq").on(
      table.fieldId,
      table.handle,
    ),
    unique("comparison_field_option_field_id_sort_index_uniq").on(
      table.fieldId,
      table.sortIndex,
    ),
    unique("comparison_field_option_field_id_id_uniq").on(
      table.fieldId,
      table.id,
    ),
    index("idx_comparison_field_option_store_id").on(table.storeId),
    index("idx_comparison_field_option_field_sort").on(
      table.fieldId,
      table.sortIndex,
    ),
  ],
);

export const comparisonProfileTranslation = catalogSchema.table(
  "comparison_profile_translation",
  {
    storeId: uuid("store_id").notNull(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => comparisonProfile.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),
    name: text("name").notNull(),
    missingLabel: text("missing_label").notNull().default("—"),
    notApplicableLabel: text("not_applicable_label").notNull().default("N/A"),
    unavailableLabel: text("unavailable_label")
      .notNull()
      .default("Unavailable"),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.locale] }),
    index("idx_comparison_profile_translation_store_locale").on(
      table.storeId,
      table.locale,
    ),
    check(
      "comparison_profile_translation_labels_shape_check",
      sql`length(btrim(${table.missingLabel})) > 0
        AND length(btrim(${table.notApplicableLabel})) > 0
        AND length(btrim(${table.unavailableLabel})) > 0`,
    ),
  ],
);

export const comparisonGroupTranslation = catalogSchema.table(
  "comparison_group_translation",
  {
    storeId: uuid("store_id").notNull(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => comparisonGroup.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.locale] }),
    index("idx_comparison_group_translation_store_locale").on(
      table.storeId,
      table.locale,
    ),
  ],
);

export const comparisonFieldTranslation = catalogSchema.table(
  "comparison_field_translation",
  {
    storeId: uuid("store_id").notNull(),
    fieldId: uuid("field_id")
      .notNull()
      .references(() => comparisonField.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),
    name: text("name").notNull(),
    description: text("description"),
  },
  (table) => [
    primaryKey({ columns: [table.fieldId, table.locale] }),
    index("idx_comparison_field_translation_store_locale").on(
      table.storeId,
      table.locale,
    ),
  ],
);

export const comparisonFieldOptionTranslation = catalogSchema.table(
  "comparison_field_option_translation",
  {
    storeId: uuid("store_id").notNull(),
    fieldOptionId: uuid("field_option_id")
      .notNull()
      .references(() => comparisonFieldOption.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.fieldOptionId, table.locale] }),
    index("idx_comparison_field_option_translation_store_locale").on(
      table.storeId,
      table.locale,
    ),
  ],
);

export const categoryComparisonProfile = catalogSchema.table(
  "category_comparison_profile",
  {
    storeId: uuid("store_id").notNull(),
    categoryId: uuid("category_id")
      .primaryKey()
      .references(() => category.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => comparisonProfile.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_category_comparison_profile_store_id").on(table.storeId),
    index("idx_category_comparison_profile_store_category").on(
      table.storeId,
      table.categoryId,
    ),
    index("idx_category_comparison_profile_store_profile").on(
      table.storeId,
      table.profileId,
    ),
    index("idx_category_comparison_profile_profile_id").on(table.profileId),
  ],
);

export const comparisonFeatureBinding = catalogSchema.table(
  "comparison_feature_binding",
  {
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    featureId: uuid("feature_id").primaryKey(),
    profileId: uuid("profile_id").notNull(),
    fieldId: uuid("field_id").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "comparison_feature_binding_product_feature_fk",
      columns: [table.productId, table.featureId],
      foreignColumns: [productFeature.productId, productFeature.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "comparison_feature_binding_profile_field_fk",
      columns: [table.profileId, table.fieldId],
      foreignColumns: [comparisonField.profileId, comparisonField.id],
    }).onDelete("restrict"),
    unique("comparison_feature_binding_feature_field_uniq").on(
      table.featureId,
      table.fieldId,
    ),
    unique("comparison_feature_binding_product_field_uniq").on(
      table.productId,
      table.fieldId,
    ),
    index("idx_comparison_feature_binding_store_id").on(table.storeId),
    index("idx_comparison_feature_binding_store_product_field").on(
      table.storeId,
      table.productId,
      table.fieldId,
    ),
    index("idx_comparison_feature_binding_profile_field").on(
      table.profileId,
      table.fieldId,
    ),
  ],
);

/**
 * Maps one product-local variant option (for example size or color) to a
 * canonical comparison row. Options are explicit sources just like features;
 * their mutable handles are never used as cross-product semantic identity.
 */
export const comparisonOptionBinding = catalogSchema.table(
  "comparison_option_binding",
  {
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    optionId: uuid("option_id").primaryKey(),
    profileId: uuid("profile_id").notNull(),
    fieldId: uuid("field_id").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "comparison_option_binding_product_option_fk",
      columns: [table.productId, table.optionId],
      foreignColumns: [productOption.productId, productOption.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "comparison_option_binding_profile_field_fk",
      columns: [table.profileId, table.fieldId],
      foreignColumns: [comparisonField.profileId, comparisonField.id],
    }).onDelete("restrict"),
    unique("comparison_option_binding_option_field_uniq").on(
      table.optionId,
      table.fieldId,
    ),
    unique("comparison_option_binding_product_field_uniq").on(
      table.productId,
      table.fieldId,
    ),
    index("idx_comparison_option_binding_store_id").on(table.storeId),
    index("idx_comparison_option_binding_store_product_field").on(
      table.storeId,
      table.productId,
      table.fieldId,
    ),
    index("idx_comparison_option_binding_profile_field").on(
      table.profileId,
      table.fieldId,
    ),
  ],
);

export const comparisonFieldNotApplicable = catalogSchema.table(
  "comparison_field_not_applicable",
  {
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull(),
    fieldId: uuid("field_id").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.fieldId] }),
    foreignKey({
      name: "comparison_field_not_applicable_profile_field_fk",
      columns: [table.profileId, table.fieldId],
      foreignColumns: [comparisonField.profileId, comparisonField.id],
    }).onDelete("restrict"),
    check(
      "comparison_field_not_applicable_reason_shape_check",
      sql`${table.reason} IS NULL OR length(btrim(${table.reason})) > 0`,
    ),
    index("idx_comparison_field_not_applicable_store_id").on(table.storeId),
    index("idx_comparison_field_not_applicable_store_product_field").on(
      table.storeId,
      table.productId,
      table.fieldId,
    ),
    index("idx_comparison_field_not_applicable_profile_field").on(
      table.profileId,
      table.fieldId,
    ),
  ],
);

export const comparisonFeatureValueBinding = catalogSchema.table(
  "comparison_feature_value_binding",
  {
    storeId: uuid("store_id").notNull(),
    featureId: uuid("feature_id").notNull(),
    featureValueId: uuid("feature_value_id").primaryKey(),
    fieldId: uuid("field_id").notNull(),
    valueType: comparisonValueTypeEnum("value_type").notNull(),
    fieldOptionId: uuid("field_option_id"),
    decimalValue: numeric("decimal_value", {
      precision: 38,
      scale: 12,
      mode: "string",
    }),
    integerValue: bigint("integer_value", { mode: "bigint" }),
    booleanValue: boolean("boolean_value"),
    textValue: text("text_value"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "comparison_feature_value_binding_feature_value_fk",
      columns: [table.featureId, table.featureValueId],
      foreignColumns: [productFeatureValue.featureId, productFeatureValue.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "comparison_feature_value_binding_feature_field_fk",
      columns: [table.featureId, table.fieldId],
      foreignColumns: [
        comparisonFeatureBinding.featureId,
        comparisonFeatureBinding.fieldId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "comparison_feature_value_binding_field_type_fk",
      columns: [table.fieldId, table.valueType],
      foreignColumns: [comparisonField.id, comparisonField.valueType],
    }).onDelete("restrict"),
    foreignKey({
      name: "comparison_feature_value_binding_field_option_fk",
      columns: [table.fieldId, table.fieldOptionId],
      foreignColumns: [
        comparisonFieldOption.fieldId,
        comparisonFieldOption.id,
      ],
    }).onDelete("restrict"),
    check(
      "comparison_feature_value_binding_shape_check",
      sql`(
          ${table.valueType} = 'BOOLEAN'
          AND ${table.booleanValue} IS NOT NULL
          AND ${table.decimalValue} IS NULL
          AND ${table.integerValue} IS NULL
          AND ${table.textValue} IS NULL
          AND ${table.fieldOptionId} IS NULL
        ) OR (
          ${table.valueType} = 'DECIMAL'
          AND ${table.decimalValue} IS NOT NULL
          AND ${table.booleanValue} IS NULL
          AND ${table.integerValue} IS NULL
          AND ${table.textValue} IS NULL
          AND ${table.fieldOptionId} IS NULL
        ) OR (
          ${table.valueType} = 'ENUM'
          AND ${table.fieldOptionId} IS NOT NULL
          AND ${table.booleanValue} IS NULL
          AND ${table.decimalValue} IS NULL
          AND ${table.integerValue} IS NULL
          AND ${table.textValue} IS NULL
        ) OR (
          ${table.valueType} = 'INTEGER'
          AND ${table.integerValue} IS NOT NULL
          AND ${table.booleanValue} IS NULL
          AND ${table.decimalValue} IS NULL
          AND ${table.textValue} IS NULL
          AND ${table.fieldOptionId} IS NULL
        ) OR (
          ${table.valueType} = 'TEXT'
          AND ${table.textValue} IS NOT NULL
          AND length(btrim(${table.textValue})) > 0
          AND ${table.booleanValue} IS NULL
          AND ${table.decimalValue} IS NULL
          AND ${table.integerValue} IS NULL
          AND ${table.fieldOptionId} IS NULL
        )`,
    ),
    index("idx_comparison_feature_value_binding_store_id").on(table.storeId),
    index("idx_comparison_feature_value_binding_feature_id").on(
      table.featureId,
    ),
    index("idx_comparison_feature_value_binding_field_id").on(table.fieldId),
    index("idx_comparison_feature_value_binding_store_field").on(
      table.storeId,
      table.fieldId,
    ),
    index("idx_comparison_feature_value_binding_field_option_id").on(
      table.fieldOptionId,
    ),
  ],
);

/**
 * Normalizes one local option value for comparison. A concrete variant selects
 * at most one value for an option, so the bound field is intrinsically SINGLE
 * for each comparison column even though the option owns many possible values.
 */
export const comparisonOptionValueBinding = catalogSchema.table(
  "comparison_option_value_binding",
  {
    storeId: uuid("store_id").notNull(),
    optionId: uuid("option_id").notNull(),
    optionValueId: uuid("option_value_id").primaryKey(),
    fieldId: uuid("field_id").notNull(),
    valueType: comparisonValueTypeEnum("value_type").notNull(),
    fieldOptionId: uuid("field_option_id"),
    decimalValue: numeric("decimal_value", {
      precision: 38,
      scale: 12,
      mode: "string",
    }),
    integerValue: bigint("integer_value", { mode: "bigint" }),
    booleanValue: boolean("boolean_value"),
    textValue: text("text_value"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "comparison_option_value_binding_option_value_fk",
      columns: [table.optionId, table.optionValueId],
      foreignColumns: [productOptionValue.optionId, productOptionValue.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "comparison_option_value_binding_option_field_fk",
      columns: [table.optionId, table.fieldId],
      foreignColumns: [
        comparisonOptionBinding.optionId,
        comparisonOptionBinding.fieldId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "comparison_option_value_binding_field_type_fk",
      columns: [table.fieldId, table.valueType],
      foreignColumns: [comparisonField.id, comparisonField.valueType],
    }).onDelete("restrict"),
    foreignKey({
      name: "comparison_option_value_binding_field_option_fk",
      columns: [table.fieldId, table.fieldOptionId],
      foreignColumns: [comparisonFieldOption.fieldId, comparisonFieldOption.id],
    }).onDelete("restrict"),
    check(
      "comparison_option_value_binding_shape_check",
      sql`(
          ${table.valueType} = 'BOOLEAN'
          AND ${table.booleanValue} IS NOT NULL
          AND ${table.decimalValue} IS NULL
          AND ${table.integerValue} IS NULL
          AND ${table.textValue} IS NULL
          AND ${table.fieldOptionId} IS NULL
        ) OR (
          ${table.valueType} = 'DECIMAL'
          AND ${table.decimalValue} IS NOT NULL
          AND ${table.booleanValue} IS NULL
          AND ${table.integerValue} IS NULL
          AND ${table.textValue} IS NULL
          AND ${table.fieldOptionId} IS NULL
        ) OR (
          ${table.valueType} = 'ENUM'
          AND ${table.fieldOptionId} IS NOT NULL
          AND ${table.booleanValue} IS NULL
          AND ${table.decimalValue} IS NULL
          AND ${table.integerValue} IS NULL
          AND ${table.textValue} IS NULL
        ) OR (
          ${table.valueType} = 'INTEGER'
          AND ${table.integerValue} IS NOT NULL
          AND ${table.booleanValue} IS NULL
          AND ${table.decimalValue} IS NULL
          AND ${table.textValue} IS NULL
          AND ${table.fieldOptionId} IS NULL
        ) OR (
          ${table.valueType} = 'TEXT'
          AND ${table.textValue} IS NOT NULL
          AND length(btrim(${table.textValue})) > 0
          AND ${table.booleanValue} IS NULL
          AND ${table.decimalValue} IS NULL
          AND ${table.integerValue} IS NULL
          AND ${table.fieldOptionId} IS NULL
        )`,
    ),
    index("idx_comparison_option_value_binding_store_id").on(table.storeId),
    index("idx_comparison_option_value_binding_option_id").on(table.optionId),
    index("idx_comparison_option_value_binding_field_id").on(table.fieldId),
    index("idx_comparison_option_value_binding_store_field").on(
      table.storeId,
      table.fieldId,
    ),
    index("idx_comparison_option_value_binding_field_option_id").on(
      table.fieldOptionId,
    ),
  ],
);

export type ComparisonProfile = typeof comparisonProfile.$inferSelect;
export type NewComparisonProfile = typeof comparisonProfile.$inferInsert;
export type ComparisonGroup = typeof comparisonGroup.$inferSelect;
export type NewComparisonGroup = typeof comparisonGroup.$inferInsert;
export type ComparisonField = typeof comparisonField.$inferSelect;
export type NewComparisonField = typeof comparisonField.$inferInsert;
export type ComparisonFieldOption = typeof comparisonFieldOption.$inferSelect;
export type NewComparisonFieldOption =
  typeof comparisonFieldOption.$inferInsert;
export type ComparisonProfileTranslation =
  typeof comparisonProfileTranslation.$inferSelect;
export type NewComparisonProfileTranslation =
  typeof comparisonProfileTranslation.$inferInsert;
export type ComparisonGroupTranslation =
  typeof comparisonGroupTranslation.$inferSelect;
export type NewComparisonGroupTranslation =
  typeof comparisonGroupTranslation.$inferInsert;
export type ComparisonFieldTranslation =
  typeof comparisonFieldTranslation.$inferSelect;
export type NewComparisonFieldTranslation =
  typeof comparisonFieldTranslation.$inferInsert;
export type ComparisonFieldOptionTranslation =
  typeof comparisonFieldOptionTranslation.$inferSelect;
export type NewComparisonFieldOptionTranslation =
  typeof comparisonFieldOptionTranslation.$inferInsert;
export type CategoryComparisonProfile =
  typeof categoryComparisonProfile.$inferSelect;
export type NewCategoryComparisonProfile =
  typeof categoryComparisonProfile.$inferInsert;
export type ComparisonFieldNotApplicable =
  typeof comparisonFieldNotApplicable.$inferSelect;
export type NewComparisonFieldNotApplicable =
  typeof comparisonFieldNotApplicable.$inferInsert;
export type ComparisonFeatureBinding =
  typeof comparisonFeatureBinding.$inferSelect;
export type NewComparisonFeatureBinding =
  typeof comparisonFeatureBinding.$inferInsert;
export type ComparisonOptionBinding =
  typeof comparisonOptionBinding.$inferSelect;
export type NewComparisonOptionBinding =
  typeof comparisonOptionBinding.$inferInsert;
export type ComparisonFeatureValueBinding =
  typeof comparisonFeatureValueBinding.$inferSelect;
export type NewComparisonFeatureValueBinding =
  typeof comparisonFeatureValueBinding.$inferInsert;
export type ComparisonOptionValueBinding =
  typeof comparisonOptionValueBinding.$inferSelect;
export type NewComparisonOptionValueBinding =
  typeof comparisonOptionValueBinding.$inferInsert;
