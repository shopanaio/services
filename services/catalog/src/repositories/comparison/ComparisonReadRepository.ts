import { and, asc, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import { category, productCategory } from "../models/categories.js";
import {
  categoryComparisonProfile,
  comparisonFeatureBinding,
  comparisonFeatureValueBinding,
  comparisonField,
  comparisonFieldNotApplicable,
  comparisonFieldOption,
  comparisonFieldOptionTranslation,
  comparisonFieldTranslation,
  comparisonGroup,
  comparisonGroupTranslation,
  comparisonOptionBinding,
  comparisonOptionValueBinding,
  comparisonProfile,
  comparisonProfileTranslation,
} from "../models/comparison.js";
import { product, variant } from "../models/products.js";
import { productOptionVariantLink } from "../models/options.js";
import type {
  ComparisonCandidate,
  ComparisonConfigurationRows,
  EffectiveComparisonProfileRow,
  LocalizedComparisonProfile,
} from "./comparison-types.js";

export class ComparisonReadRepository extends BaseRepository {
  async getAllProfiles() {
    return this.connection
      .select()
      .from(comparisonProfile)
      .where(eq(comparisonProfile.storeId, this.storeId))
      .orderBy(asc(comparisonProfile.handle), asc(comparisonProfile.id));
  }
  async getByIds(ids: readonly string[]) {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(comparisonProfile)
      .where(
        and(
          eq(comparisonProfile.storeId, this.storeId),
          inArray(comparisonProfile.id, [...new Set(ids)]),
        ),
      );
  }

  async findById(id: string) {
    return (await this.getByIds([id]))[0] ?? null;
  }

  async findByHandle(handle: string) {
    const rows = await this.connection
      .select()
      .from(comparisonProfile)
      .where(and(eq(comparisonProfile.storeId, this.storeId), eq(comparisonProfile.handle, handle)))
      .limit(1);
    return rows[0] ?? null;
  }

  async getLocalizedProfiles(ids: readonly string[]): Promise<LocalizedComparisonProfile[]> {
    const profiles = await this.getByIds(ids);
    if (profiles.length === 0) return [];
    const locales = [
      ...new Set([this.ctx.locale ?? this.ctx.store.defaultLocale, this.ctx.store.defaultLocale]),
    ];
    const translations = await this.connection
      .select()
      .from(comparisonProfileTranslation)
      .where(
        and(
          eq(comparisonProfileTranslation.storeId, this.storeId),
          inArray(
            comparisonProfileTranslation.profileId,
            profiles.map((row) => row.id),
          ),
          inArray(comparisonProfileTranslation.locale, locales as never[]),
        ),
      );
    return profiles.map((profile) => {
      const translation =
        translations.find((row) => row.profileId === profile.id && row.locale === locales[0]) ??
        translations.find((row) => row.profileId === profile.id && row.locale === locales[1]);
      return {
        ...profile,
        name: translation?.name ?? profile.handle,
        missingLabel: translation?.missingLabel ?? "—",
        notApplicableLabel: translation?.notApplicableLabel ?? "N/A",
        unavailableLabel: translation?.unavailableLabel ?? "Unavailable",
      };
    });
  }

  async getGroupsByProfileIds(profileIds: readonly string[]) {
    if (profileIds.length === 0) return [];
    return this.connection
      .select()
      .from(comparisonGroup)
      .where(
        and(
          eq(comparisonGroup.storeId, this.storeId),
          inArray(comparisonGroup.profileId, [...new Set(profileIds)]),
        ),
      )
      .orderBy(asc(comparisonGroup.sortIndex), asc(comparisonGroup.id));
  }
  async getGroupsByIds(ids: readonly string[]) {
    if (!ids.length) return [];
    return this.connection
      .select()
      .from(comparisonGroup)
      .where(
        and(
          eq(comparisonGroup.storeId, this.storeId),
          inArray(comparisonGroup.id, [...new Set(ids)]),
        ),
      );
  }
  async getFieldsByIds(ids: readonly string[]) {
    if (!ids.length) return [];
    return this.connection
      .select()
      .from(comparisonField)
      .where(
        and(
          eq(comparisonField.storeId, this.storeId),
          inArray(comparisonField.id, [...new Set(ids)]),
        ),
      );
  }
  async getFieldOptionsByIds(ids: readonly string[]) {
    if (!ids.length) return [];
    return this.connection
      .select()
      .from(comparisonFieldOption)
      .where(
        and(
          eq(comparisonFieldOption.storeId, this.storeId),
          inArray(comparisonFieldOption.id, [...new Set(ids)]),
        ),
      );
  }

  async getFieldsByProfileIds(profileIds: readonly string[]) {
    if (profileIds.length === 0) return [];
    return this.connection
      .select()
      .from(comparisonField)
      .where(
        and(
          eq(comparisonField.storeId, this.storeId),
          inArray(comparisonField.profileId, [...new Set(profileIds)]),
        ),
      )
      .orderBy(
        asc(comparisonField.groupId),
        asc(comparisonField.sortIndex),
        asc(comparisonField.id),
      );
  }

  async getOptionsByFieldIds(fieldIds: readonly string[]) {
    if (fieldIds.length === 0) return [];
    return this.connection
      .select()
      .from(comparisonFieldOption)
      .where(
        and(
          eq(comparisonFieldOption.storeId, this.storeId),
          inArray(comparisonFieldOption.fieldId, [...new Set(fieldIds)]),
        ),
      )
      .orderBy(asc(comparisonFieldOption.sortIndex), asc(comparisonFieldOption.id));
  }

  async getTranslations(profileIds: readonly string[]) {
    const fields = await this.getFieldsByProfileIds(profileIds);
    const groups = await this.getGroupsByProfileIds(profileIds);
    const options = await this.getOptionsByFieldIds(fields.map((row) => row.id));
    const locales = [
      ...new Set([this.ctx.locale ?? this.ctx.store.defaultLocale, this.ctx.store.defaultLocale]),
    ];
    const [groupTranslations, fieldTranslations, optionTranslations] = await Promise.all([
      groups.length === 0
        ? []
        : this.connection
            .select()
            .from(comparisonGroupTranslation)
            .where(
              and(
                eq(comparisonGroupTranslation.storeId, this.storeId),
                inArray(
                  comparisonGroupTranslation.groupId,
                  groups.map((row) => row.id),
                ),
                inArray(comparisonGroupTranslation.locale, locales as never[]),
              ),
            ),
      fields.length === 0
        ? []
        : this.connection
            .select()
            .from(comparisonFieldTranslation)
            .where(
              and(
                eq(comparisonFieldTranslation.storeId, this.storeId),
                inArray(
                  comparisonFieldTranslation.fieldId,
                  fields.map((row) => row.id),
                ),
                inArray(comparisonFieldTranslation.locale, locales as never[]),
              ),
            ),
      options.length === 0
        ? []
        : this.connection
            .select()
            .from(comparisonFieldOptionTranslation)
            .where(
              and(
                eq(comparisonFieldOptionTranslation.storeId, this.storeId),
                inArray(
                  comparisonFieldOptionTranslation.fieldOptionId,
                  options.map((row) => row.id),
                ),
                inArray(comparisonFieldOptionTranslation.locale, locales as never[]),
              ),
            ),
    ]);
    return { locales, groupTranslations, fieldTranslations, optionTranslations };
  }

  async getDirectProfilesByCategoryIds(categoryIds: readonly string[]) {
    if (categoryIds.length === 0) return [];
    return this.connection
      .select()
      .from(categoryComparisonProfile)
      .where(
        and(
          eq(categoryComparisonProfile.storeId, this.storeId),
          inArray(categoryComparisonProfile.categoryId, [...new Set(categoryIds)]),
        ),
      );
  }

  async getEffectiveProfilesByCategoryIds(
    categoryIds: readonly string[],
  ): Promise<EffectiveComparisonProfileRow[]> {
    if (categoryIds.length === 0) return [];
    const uniqueIds = [...new Set(categoryIds)];
    const rows = await this.connection.execute<EffectiveComparisonProfileRow>(sql`
      WITH RECURSIVE requested(category_id) AS (
        SELECT unnest(${uniqueIds}::uuid[])
      ), ancestors AS (
        SELECT requested.category_id AS owner_id, c.id AS category_id, c.parent_id, 0 AS distance
        FROM requested
        JOIN catalog.category c ON c.id = requested.category_id
          AND c.store_id = ${this.storeId} AND c.deleted_at IS NULL
        UNION ALL
        SELECT ancestors.owner_id, parent.id, parent.parent_id, ancestors.distance + 1
        FROM ancestors
        JOIN catalog.category parent ON parent.id = ancestors.parent_id
          AND parent.store_id = ${this.storeId} AND parent.deleted_at IS NULL
      ), resolved AS (
        SELECT DISTINCT ON (ancestors.owner_id)
          ancestors.owner_id, ancestors.category_id, ccp.profile_id
        FROM ancestors
        JOIN catalog.category_comparison_profile ccp
          ON ccp.category_id = ancestors.category_id AND ccp.store_id = ${this.storeId}
        ORDER BY ancestors.owner_id, ancestors.distance
      )
      SELECT requested.category_id AS "ownerId",
        COALESCE(resolved.category_id, requested.category_id) AS "categoryId",
        profile.id AS "profileId", profile.enabled
      FROM requested
      LEFT JOIN resolved ON resolved.owner_id = requested.category_id
      LEFT JOIN catalog.comparison_profile profile
        ON profile.id = resolved.profile_id AND profile.store_id = ${this.storeId}
    `);
    return rows;
  }

  async getEffectiveProfilesByProductIds(
    productIds: readonly string[],
  ): Promise<EffectiveComparisonProfileRow[]> {
    if (productIds.length === 0) return [];
    const links = await this.connection
      .select({ ownerId: productCategory.productId, categoryId: productCategory.categoryId })
      .from(productCategory)
      .where(
        and(
          eq(productCategory.storeId, this.storeId),
          inArray(productCategory.productId, [...new Set(productIds)]),
          eq(productCategory.isPrimary, true),
        ),
      );
    const byCategory = new Map(
      (await this.getEffectiveProfilesByCategoryIds(links.map((row) => row.categoryId))).map(
        (row) => [row.ownerId, row],
      ),
    );
    return links.map((link) => ({
      ...(byCategory.get(link.categoryId) ?? {
        categoryId: link.categoryId,
        profileId: null,
        enabled: null,
      }),
      ownerId: link.ownerId,
    }));
  }

  async getConfigurationRows(productIds: readonly string[]): Promise<ComparisonConfigurationRows> {
    if (productIds.length === 0)
      return {
        featureBindings: [],
        featureValues: [],
        optionBindings: [],
        optionValues: [],
        notApplicable: [],
      };
    const ids = [...new Set(productIds)];
    const [featureBindings, optionBindings, notApplicable] = await Promise.all([
      this.connection
        .select()
        .from(comparisonFeatureBinding)
        .where(
          and(
            eq(comparisonFeatureBinding.storeId, this.storeId),
            inArray(comparisonFeatureBinding.productId, ids),
          ),
        ),
      this.connection
        .select()
        .from(comparisonOptionBinding)
        .where(
          and(
            eq(comparisonOptionBinding.storeId, this.storeId),
            inArray(comparisonOptionBinding.productId, ids),
          ),
        ),
      this.connection
        .select()
        .from(comparisonFieldNotApplicable)
        .where(
          and(
            eq(comparisonFieldNotApplicable.storeId, this.storeId),
            inArray(comparisonFieldNotApplicable.productId, ids),
          ),
        ),
    ]);
    const [featureValues, optionValues] = await Promise.all([
      featureBindings.length === 0
        ? []
        : this.connection
            .select()
            .from(comparisonFeatureValueBinding)
            .where(
              and(
                eq(comparisonFeatureValueBinding.storeId, this.storeId),
                inArray(
                  comparisonFeatureValueBinding.featureId,
                  featureBindings.map((row) => row.featureId),
                ),
              ),
            ),
      optionBindings.length === 0
        ? []
        : this.connection
            .select()
            .from(comparisonOptionValueBinding)
            .where(
              and(
                eq(comparisonOptionValueBinding.storeId, this.storeId),
                inArray(
                  comparisonOptionValueBinding.optionId,
                  optionBindings.map((row) => row.optionId),
                ),
              ),
            ),
    ]);
    return { featureBindings, featureValues, optionBindings, optionValues, notApplicable };
  }

  async getSelectedOptionLinks(variantIds: readonly string[]) {
    if (variantIds.length === 0) return [];
    return this.connection
      .select()
      .from(productOptionVariantLink)
      .where(
        and(
          eq(productOptionVariantLink.storeId, this.storeId),
          inArray(productOptionVariantLink.variantId, [...new Set(variantIds)]),
        ),
      );
  }

  async getVisibleCandidates(categoryId: string): Promise<ComparisonCandidate[]> {
    const now = new Date().toISOString();
    return this.connection
      .select({
        productId: product.id,
        variantId: variant.id,
        categoryId: productCategory.categoryId,
        lexoRank: productCategory.lexoRank,
        isDefault: variant.isDefault,
        variantCreatedAt: variant.createdAt,
      })
      .from(productCategory)
      .innerJoin(
        category,
        and(eq(category.storeId, this.storeId), eq(category.id, productCategory.categoryId)),
      )
      .innerJoin(
        product,
        and(eq(product.storeId, this.storeId), eq(product.id, productCategory.productId)),
      )
      .innerJoin(variant, and(eq(variant.storeId, this.storeId), eq(variant.productId, product.id)))
      .where(
        and(
          eq(productCategory.storeId, this.storeId),
          eq(productCategory.categoryId, categoryId),
          eq(productCategory.isPrimary, true),
          isNull(category.deletedAt),
          isNotNull(category.publishedAt),
          lte(category.publishedAt, now),
          isNull(product.deletedAt),
          isNotNull(product.publishedAt),
          lte(product.publishedAt, now),
          isNull(variant.deletedAt),
        ),
      )
      .orderBy(
        asc(productCategory.lexoRank),
        asc(product.id),
        sql`${variant.isDefault} DESC`,
        asc(variant.createdAt),
        asc(variant.id),
      );
  }

  async productConfigurationProfileIds(productId: string): Promise<string[]> {
    const rows = await this.connection.execute<{ profileId: string }>(sql`
      SELECT DISTINCT profile_id AS "profileId" FROM (
        SELECT profile_id FROM catalog.comparison_feature_binding WHERE store_id = ${this.storeId} AND product_id = ${productId}
        UNION ALL SELECT profile_id FROM catalog.comparison_option_binding WHERE store_id = ${this.storeId} AND product_id = ${productId}
        UNION ALL SELECT profile_id FROM catalog.comparison_field_not_applicable WHERE store_id = ${this.storeId} AND product_id = ${productId}
      ) configured
    `);
    return rows.map((row) => row.profileId);
  }

  async categoryAssignmentHasConflicts(
    categoryId: string,
    targetProfileId: string | null,
  ): Promise<boolean> {
    const rows = await this.connection.execute<{ conflict: boolean }>(sql`
      WITH RECURSIVE affected AS (
        SELECT id FROM catalog.category WHERE store_id = ${this.storeId} AND id = ${categoryId} AND deleted_at IS NULL
        UNION ALL
        SELECT child.id FROM catalog.category child
        JOIN affected parent ON child.parent_id = parent.id
        LEFT JOIN catalog.category_comparison_profile direct ON direct.category_id = child.id AND direct.store_id = ${this.storeId}
        WHERE child.store_id = ${this.storeId} AND child.deleted_at IS NULL AND direct.category_id IS NULL
      ), configured AS (
        SELECT pc.product_id, bindings.profile_id
        FROM catalog.product_category pc
        JOIN affected ON affected.id = pc.category_id
        JOIN (
          SELECT product_id, profile_id FROM catalog.comparison_feature_binding WHERE store_id = ${this.storeId}
          UNION SELECT product_id, profile_id FROM catalog.comparison_option_binding WHERE store_id = ${this.storeId}
          UNION SELECT product_id, profile_id FROM catalog.comparison_field_not_applicable WHERE store_id = ${this.storeId}
        ) bindings ON bindings.product_id = pc.product_id
        WHERE pc.store_id = ${this.storeId} AND pc.is_primary = true
      )
      SELECT EXISTS(SELECT 1 FROM configured WHERE profile_id IS DISTINCT FROM ${targetProfileId}) AS conflict
    `);
    return rows[0]?.conflict ?? false;
  }
}
