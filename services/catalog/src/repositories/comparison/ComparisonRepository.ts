import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import { category } from "../models/categories.js";
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
import { product } from "../models/products.js";
import type {
  ComparisonNormalizedValueInput,
  ComparisonProfileAggregateInput,
  ComparisonValueType,
} from "./comparison-types.js";

export interface ProductComparisonMappingInput {
  fieldId: string;
  feature?: {
    featureId: string;
    values: Array<{ valueId: string; normalized: ComparisonNormalizedValueInput }>;
  };
  option?: {
    optionId: string;
    values: Array<{ valueId: string; normalized: ComparisonNormalizedValueInput }>;
  };
  notApplicable?: { reason?: string | null };
}

export class ComparisonRepository extends BaseRepository {
  generateIds(count: number) {
    return this.generateUuidV7s(count);
  }
  async createProfile(input: ComparisonProfileAggregateInput) {
    const now = new Date().toISOString();
    const [created] = await this.connection
      .insert(comparisonProfile)
      .values({
        storeId: this.storeId,
        id: input.id,
        handle: input.handle,
        enabled: input.enabled,
        revision: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await this.syncProfileChildren(input, now);
    if (!created) throw new Error("Comparison profile insert returned no row");
    return created;
  }

  async updateProfile(input: ComparisonProfileAggregateInput, expectedRevision: number) {
    const now = new Date().toISOString();
    const [updated] = await this.connection
      .update(comparisonProfile)
      .set({
        handle: input.handle,
        enabled: input.enabled,
        revision: sql`${comparisonProfile.revision} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(comparisonProfile.storeId, this.storeId),
          eq(comparisonProfile.id, input.id),
          eq(comparisonProfile.revision, expectedRevision),
        ),
      )
      .returning();
    if (!updated) return null;
    await this.syncProfileChildren(input, now);
    return updated;
  }

  private async syncProfileChildren(input: ComparisonProfileAggregateInput, now: string) {
    const groupIds = input.groups.map((group) => group.id);
    const fields = input.groups.flatMap((group) =>
      group.fields.map((field) => ({ ...field, groupId: group.id })),
    );
    const fieldIds = fields.map((field) => field.id);
    const options = fields.flatMap((field) =>
      field.options.map((option) => ({ ...option, fieldId: field.id })),
    );
    const optionIds = options.map((option) => option.id);

    await this.connection
      .update(comparisonGroup)
      .set({ sortIndex: sql`${comparisonGroup.sortIndex} + 1000000` })
      .where(
        and(eq(comparisonGroup.storeId, this.storeId), eq(comparisonGroup.profileId, input.id)),
      );
    if (fieldIds.length > 0)
      await this.connection
        .update(comparisonField)
        .set({ sortIndex: sql`${comparisonField.sortIndex} + 1000000` })
        .where(
          and(eq(comparisonField.storeId, this.storeId), eq(comparisonField.profileId, input.id)),
        );
    if (fieldIds.length > 0)
      await this.connection
        .update(comparisonFieldOption)
        .set({ sortIndex: sql`${comparisonFieldOption.sortIndex} + 1000000` })
        .where(
          and(
            eq(comparisonFieldOption.storeId, this.storeId),
            inArray(comparisonFieldOption.fieldId, fieldIds),
          ),
        );

    for (const group of input.groups) {
      await this.connection
        .insert(comparisonGroup)
        .values({
          storeId: this.storeId,
          id: group.id,
          profileId: input.id,
          handle: group.handle,
          sortIndex: group.sortIndex,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: comparisonGroup.id,
          set: { handle: group.handle, sortIndex: group.sortIndex, updatedAt: now },
        });
      await this.connection
        .insert(comparisonGroupTranslation)
        .values({
          storeId: this.storeId,
          groupId: group.id,
          locale: input.locale as never,
          name: group.name,
        })
        .onConflictDoUpdate({
          target: [comparisonGroupTranslation.groupId, comparisonGroupTranslation.locale],
          set: { name: group.name, storeId: this.storeId },
        });
    }
    for (const field of fields) {
      await this.connection
        .insert(comparisonField)
        .values({
          storeId: this.storeId,
          id: field.id,
          profileId: input.id,
          groupId: field.groupId,
          handle: field.handle,
          valueType: field.valueType,
          cardinality: field.cardinality,
          canonicalUnit: field.canonicalUnit ?? null,
          sortIndex: field.sortIndex,
          featured: field.featured,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: comparisonField.id,
          set: {
            groupId: field.groupId,
            handle: field.handle,
            valueType: field.valueType,
            cardinality: field.cardinality,
            canonicalUnit: field.canonicalUnit ?? null,
            sortIndex: field.sortIndex,
            featured: field.featured,
            updatedAt: now,
          },
        });
      await this.connection
        .insert(comparisonFieldTranslation)
        .values({
          storeId: this.storeId,
          fieldId: field.id,
          locale: input.locale as never,
          name: field.name,
          description: field.description ?? null,
        })
        .onConflictDoUpdate({
          target: [comparisonFieldTranslation.fieldId, comparisonFieldTranslation.locale],
          set: { name: field.name, description: field.description ?? null, storeId: this.storeId },
        });
    }
    for (const option of options) {
      await this.connection
        .insert(comparisonFieldOption)
        .values({
          storeId: this.storeId,
          id: option.id,
          fieldId: option.fieldId,
          valueType: "ENUM",
          handle: option.handle,
          sortIndex: option.sortIndex,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: comparisonFieldOption.id,
          set: { handle: option.handle, sortIndex: option.sortIndex, updatedAt: now },
        });
      await this.connection
        .insert(comparisonFieldOptionTranslation)
        .values({
          storeId: this.storeId,
          fieldOptionId: option.id,
          locale: input.locale as never,
          name: option.name,
        })
        .onConflictDoUpdate({
          target: [
            comparisonFieldOptionTranslation.fieldOptionId,
            comparisonFieldOptionTranslation.locale,
          ],
          set: { name: option.name, storeId: this.storeId },
        });
    }
    if (fieldIds.length > 0) {
      await this.connection
        .delete(comparisonFieldOption)
        .where(
          and(
            eq(comparisonFieldOption.storeId, this.storeId),
            inArray(comparisonFieldOption.fieldId, fieldIds),
            ...(optionIds.length > 0 ? [notInArray(comparisonFieldOption.id, optionIds)] : []),
          ),
        );
    }
    await this.connection
      .delete(comparisonField)
      .where(
        and(
          eq(comparisonField.storeId, this.storeId),
          eq(comparisonField.profileId, input.id),
          ...(fieldIds.length > 0 ? [notInArray(comparisonField.id, fieldIds)] : []),
        ),
      );
    await this.connection
      .delete(comparisonGroup)
      .where(
        and(
          eq(comparisonGroup.storeId, this.storeId),
          eq(comparisonGroup.profileId, input.id),
          ...(groupIds.length > 0 ? [notInArray(comparisonGroup.id, groupIds)] : []),
        ),
      );
    await this.connection
      .insert(comparisonProfileTranslation)
      .values({
        storeId: this.storeId,
        profileId: input.id,
        locale: input.locale as never,
        name: input.name,
        missingLabel: input.missingLabel,
        notApplicableLabel: input.notApplicableLabel,
        unavailableLabel: input.unavailableLabel,
      })
      .onConflictDoUpdate({
        target: [comparisonProfileTranslation.profileId, comparisonProfileTranslation.locale],
        set: {
          storeId: this.storeId,
          name: input.name,
          missingLabel: input.missingLabel,
          notApplicableLabel: input.notApplicableLabel,
          unavailableLabel: input.unavailableLabel,
        },
      });
  }

  async deleteProfile(id: string) {
    const [row] = await this.connection
      .delete(comparisonProfile)
      .where(and(eq(comparisonProfile.storeId, this.storeId), eq(comparisonProfile.id, id)))
      .returning({ id: comparisonProfile.id });
    return row?.id ?? null;
  }

  async getProfileDependencyCounts(profileId: string) {
    const [rows] = await Promise.all([
      this.connection.execute<{
        categories: number;
        features: number;
        options: number;
        notApplicable: number;
      }>(sql`
      SELECT
        (SELECT count(*)::int FROM catalog.category_comparison_profile WHERE store_id = ${this.storeId} AND profile_id = ${profileId}) AS categories,
        (SELECT count(*)::int FROM catalog.comparison_feature_binding WHERE store_id = ${this.storeId} AND profile_id = ${profileId}) AS features,
        (SELECT count(*)::int FROM catalog.comparison_option_binding WHERE store_id = ${this.storeId} AND profile_id = ${profileId}) AS options,
        (SELECT count(*)::int FROM catalog.comparison_field_not_applicable WHERE store_id = ${this.storeId} AND profile_id = ${profileId}) AS "notApplicable"
    `),
    ]);
    return rows[0] ?? { categories: 0, features: 0, options: 0, notApplicable: 0 };
  }

  async setCategoryProfile(categoryId: string, profileId: string | null) {
    if (profileId === null) {
      await this.connection
        .delete(categoryComparisonProfile)
        .where(
          and(
            eq(categoryComparisonProfile.storeId, this.storeId),
            eq(categoryComparisonProfile.categoryId, categoryId),
          ),
        );
      return;
    }
    await this.connection
      .insert(categoryComparisonProfile)
      .values({ storeId: this.storeId, categoryId, profileId })
      .onConflictDoUpdate({
        target: categoryComparisonProfile.categoryId,
        set: { storeId: this.storeId, profileId },
      });
  }

  async lockCategory(id: string) {
    const rows = await this.connection
      .select()
      .from(category)
      .where(and(eq(category.storeId, this.storeId), eq(category.id, id)))
      .for("update");
    return rows[0] ?? null;
  }

  async lockProduct(id: string) {
    const rows = await this.connection
      .select()
      .from(product)
      .where(and(eq(product.storeId, this.storeId), eq(product.id, id)))
      .for("update");
    return rows[0] ?? null;
  }

  async syncProductConfiguration(
    productId: string,
    profileId: string,
    mappings: ProductComparisonMappingInput[],
  ) {
    const now = new Date().toISOString();
    await this.connection
      .delete(comparisonFeatureBinding)
      .where(
        and(
          eq(comparisonFeatureBinding.storeId, this.storeId),
          eq(comparisonFeatureBinding.productId, productId),
        ),
      );
    await this.connection
      .delete(comparisonOptionBinding)
      .where(
        and(
          eq(comparisonOptionBinding.storeId, this.storeId),
          eq(comparisonOptionBinding.productId, productId),
        ),
      );
    await this.connection
      .delete(comparisonFieldNotApplicable)
      .where(
        and(
          eq(comparisonFieldNotApplicable.storeId, this.storeId),
          eq(comparisonFieldNotApplicable.productId, productId),
        ),
      );
    for (const mapping of mappings) {
      if (mapping.feature) {
        await this.connection.insert(comparisonFeatureBinding).values({
          storeId: this.storeId,
          productId,
          featureId: mapping.feature.featureId,
          profileId,
          fieldId: mapping.fieldId,
          createdAt: now,
          updatedAt: now,
        });
        for (const value of mapping.feature.values)
          await this.insertFeatureValue(
            mapping.feature.featureId,
            mapping.fieldId,
            value.valueId,
            value.normalized,
            now,
          );
      } else if (mapping.option) {
        await this.connection.insert(comparisonOptionBinding).values({
          storeId: this.storeId,
          productId,
          optionId: mapping.option.optionId,
          profileId,
          fieldId: mapping.fieldId,
          createdAt: now,
          updatedAt: now,
        });
        for (const value of mapping.option.values)
          await this.insertOptionValue(
            mapping.option.optionId,
            mapping.fieldId,
            value.valueId,
            value.normalized,
            now,
          );
      } else if (mapping.notApplicable) {
        await this.connection.insert(comparisonFieldNotApplicable).values({
          storeId: this.storeId,
          productId,
          profileId,
          fieldId: mapping.fieldId,
          reason: mapping.notApplicable.reason?.trim() || null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    const [updated] = await this.connection
      .update(product)
      .set({ revision: sql`${product.revision} + 1`, updatedAt: now })
      .where(and(eq(product.storeId, this.storeId), eq(product.id, productId)))
      .returning();
    if (!updated) throw new Error("Product revision update returned no row");
    return updated;
  }

  private valueRow(fieldId: string, normalized: ComparisonNormalizedValueInput, now: string) {
    const valueType: ComparisonValueType =
      normalized.fieldOptionId != null
        ? "ENUM"
        : normalized.booleanValue != null
          ? "BOOLEAN"
          : normalized.decimalValue != null
            ? "DECIMAL"
            : normalized.integerValue != null
              ? "INTEGER"
              : "TEXT";
    return {
      storeId: this.storeId,
      fieldId,
      valueType,
      fieldOptionId: normalized.fieldOptionId ?? null,
      booleanValue: normalized.booleanValue ?? null,
      decimalValue: normalized.decimalValue ?? null,
      integerValue: normalized.integerValue == null ? null : BigInt(normalized.integerValue),
      textValue: normalized.textValue?.trim() ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async insertFeatureValue(
    featureId: string,
    fieldId: string,
    featureValueId: string,
    normalized: ComparisonNormalizedValueInput,
    now: string,
  ) {
    await this.connection
      .insert(comparisonFeatureValueBinding)
      .values({ ...this.valueRow(fieldId, normalized, now), featureId, featureValueId });
  }

  private async insertOptionValue(
    optionId: string,
    fieldId: string,
    optionValueId: string,
    normalized: ComparisonNormalizedValueInput,
    now: string,
  ) {
    await this.connection
      .insert(comparisonOptionValueBinding)
      .values({ ...this.valueRow(fieldId, normalized, now), optionId, optionValueId });
  }
}
