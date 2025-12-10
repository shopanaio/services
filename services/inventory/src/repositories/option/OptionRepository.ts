import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  productOption,
  productOptionValue,
  productOptionSwatch,
  productOptionVariantLink,
  productOptionTranslation,
  productOptionValueTranslation,
  type ProductOption,
  type NewProductOption,
  type ProductOptionValue,
  type NewProductOptionValue,
  type ProductOptionSwatch,
  type NewProductOptionSwatch,
  type ProductOptionVariantLink,
  type NewProductOptionVariantLink,
  type ProductOptionTranslation,
  type ProductOptionValueTranslation,
} from "../models/index.js";

export class OptionRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? "uk";
  }

  // ============ Options CRUD ============

  async findById(id: string): Promise<ProductOption | null> {
    const result = await this.connection
      .select()
      .from(productOption)
      .where(
        and(eq(productOption.projectId, this.projectId), eq(productOption.id, id))
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findBySlug(productId: string, slug: string): Promise<ProductOption | null> {
    const result = await this.connection
      .select()
      .from(productOption)
      .where(
        and(
          eq(productOption.projectId, this.projectId),
          eq(productOption.productId, productId),
          eq(productOption.slug, slug)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findByProductId(productId: string): Promise<ProductOption[]> {
    return this.connection
      .select()
      .from(productOption)
      .where(
        and(
          eq(productOption.projectId, this.projectId),
          eq(productOption.productId, productId)
        )
      );
  }

  async findByProductIds(productIds: string[]): Promise<Map<string, ProductOption[]>> {
    if (productIds.length === 0) return new Map();

    const results = await this.connection
      .select()
      .from(productOption)
      .where(
        and(
          eq(productOption.projectId, this.projectId),
          inArray(productOption.productId, productIds)
        )
      );

    const map = new Map<string, ProductOption[]>();
    for (const option of results) {
      const existing = map.get(option.productId) ?? [];
      existing.push(option);
      map.set(option.productId, existing);
    }
    return map;
  }

  async create(
    productId: string,
    data: { slug: string; displayType: string }
  ): Promise<ProductOption> {
    const id = randomUUID();

    const newOption: NewProductOption = {
      id,
      projectId: this.projectId,
      productId,
      slug: data.slug,
      displayType: data.displayType,
    };

    const result = await this.connection
      .insert(productOption)
      .values(newOption)
      .returning();

    return result[0];
  }

  async update(
    id: string,
    data: { slug?: string; displayType?: string }
  ): Promise<ProductOption | null> {
    const updateData: Partial<NewProductOption> = {};

    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.displayType !== undefined) updateData.displayType = data.displayType;

    if (Object.keys(updateData).length === 0) {
      return this.findById(id);
    }

    const result = await this.connection
      .update(productOption)
      .set(updateData)
      .where(
        and(eq(productOption.projectId, this.projectId), eq(productOption.id, id))
      )
      .returning();

    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(productOption)
      .where(
        and(eq(productOption.projectId, this.projectId), eq(productOption.id, id))
      )
      .returning({ id: productOption.id });

    return result.length > 0;
  }

  // ============ Option Values ============

  async findValueById(id: string): Promise<ProductOptionValue | null> {
    const result = await this.connection
      .select()
      .from(productOptionValue)
      .where(
        and(
          eq(productOptionValue.projectId, this.projectId),
          eq(productOptionValue.id, id)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findValuesByOptionId(optionId: string): Promise<ProductOptionValue[]> {
    return this.connection
      .select()
      .from(productOptionValue)
      .where(
        and(
          eq(productOptionValue.projectId, this.projectId),
          eq(productOptionValue.optionId, optionId)
        )
      )
      .orderBy(productOptionValue.sortIndex);
  }

  async findValuesByOptionIds(
    optionIds: string[]
  ): Promise<Map<string, ProductOptionValue[]>> {
    if (optionIds.length === 0) return new Map();

    const results = await this.connection
      .select()
      .from(productOptionValue)
      .where(
        and(
          eq(productOptionValue.projectId, this.projectId),
          inArray(productOptionValue.optionId, optionIds)
        )
      )
      .orderBy(productOptionValue.sortIndex);

    const map = new Map<string, ProductOptionValue[]>();
    for (const value of results) {
      const existing = map.get(value.optionId) ?? [];
      existing.push(value);
      map.set(value.optionId, existing);
    }
    return map;
  }

  async createValue(
    optionId: string,
    data: { slug: string; sortIndex: number; swatchId?: string | null }
  ): Promise<ProductOptionValue> {
    const id = randomUUID();

    const newValue: NewProductOptionValue = {
      id,
      projectId: this.projectId,
      optionId,
      slug: data.slug,
      sortIndex: data.sortIndex,
      swatchId: data.swatchId ?? null,
    };

    const result = await this.connection
      .insert(productOptionValue)
      .values(newValue)
      .returning();

    return result[0];
  }

  async updateValue(
    id: string,
    data: { slug?: string; sortIndex?: number; swatchId?: string | null }
  ): Promise<ProductOptionValue | null> {
    const updateData: Partial<NewProductOptionValue> = {};

    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.sortIndex !== undefined) updateData.sortIndex = data.sortIndex;
    if (data.swatchId !== undefined) updateData.swatchId = data.swatchId;

    if (Object.keys(updateData).length === 0) {
      return this.findValueById(id);
    }

    const result = await this.connection
      .update(productOptionValue)
      .set(updateData)
      .where(
        and(
          eq(productOptionValue.projectId, this.projectId),
          eq(productOptionValue.id, id)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  async deleteValue(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(productOptionValue)
      .where(
        and(
          eq(productOptionValue.projectId, this.projectId),
          eq(productOptionValue.id, id)
        )
      )
      .returning({ id: productOptionValue.id });

    return result.length > 0;
  }

  // ============ Swatches ============

  async createSwatch(data: {
    swatchType: string;
    colorOne?: string | null;
    colorTwo?: string | null;
    imageId?: string | null;
    metadata?: unknown;
  }): Promise<ProductOptionSwatch> {
    const id = randomUUID();

    const newSwatch: NewProductOptionSwatch = {
      id,
      projectId: this.projectId,
      swatchType: data.swatchType,
      colorOne: data.colorOne ?? null,
      colorTwo: data.colorTwo ?? null,
      imageId: data.imageId ?? null,
      metadata: data.metadata ?? null,
    };

    const result = await this.connection
      .insert(productOptionSwatch)
      .values(newSwatch)
      .returning();

    return result[0];
  }

  async updateSwatch(
    id: string,
    data: {
      swatchType?: string;
      colorOne?: string | null;
      colorTwo?: string | null;
      imageId?: string | null;
      metadata?: unknown;
    }
  ): Promise<ProductOptionSwatch | null> {
    const updateData: Partial<NewProductOptionSwatch> = {};

    if (data.swatchType !== undefined) updateData.swatchType = data.swatchType;
    if (data.colorOne !== undefined) updateData.colorOne = data.colorOne;
    if (data.colorTwo !== undefined) updateData.colorTwo = data.colorTwo;
    if (data.imageId !== undefined) updateData.imageId = data.imageId;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    if (Object.keys(updateData).length === 0) {
      return this.findSwatchById(id);
    }

    const result = await this.connection
      .update(productOptionSwatch)
      .set(updateData)
      .where(
        and(
          eq(productOptionSwatch.projectId, this.projectId),
          eq(productOptionSwatch.id, id)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  async findSwatchById(id: string): Promise<ProductOptionSwatch | null> {
    const result = await this.connection
      .select()
      .from(productOptionSwatch)
      .where(
        and(
          eq(productOptionSwatch.projectId, this.projectId),
          eq(productOptionSwatch.id, id)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async deleteSwatch(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(productOptionSwatch)
      .where(
        and(
          eq(productOptionSwatch.projectId, this.projectId),
          eq(productOptionSwatch.id, id)
        )
      )
      .returning({ id: productOptionSwatch.id });

    return result.length > 0;
  }

  // ============ Variant Links ============

  async linkVariant(
    variantId: string,
    optionId: string,
    optionValueId: string
  ): Promise<void> {
    const newLink: NewProductOptionVariantLink = {
      projectId: this.projectId,
      variantId,
      optionId,
      optionValueId,
    };

    await this.connection
      .insert(productOptionVariantLink)
      .values(newLink)
      .onConflictDoUpdate({
        target: [productOptionVariantLink.variantId, productOptionVariantLink.optionId],
        set: { optionValueId },
      });
  }

  async unlinkVariant(variantId: string, optionId: string): Promise<void> {
    await this.connection
      .delete(productOptionVariantLink)
      .where(
        and(
          eq(productOptionVariantLink.projectId, this.projectId),
          eq(productOptionVariantLink.variantId, variantId),
          eq(productOptionVariantLink.optionId, optionId)
        )
      );
  }

  async clearVariantLinks(variantId: string): Promise<void> {
    await this.connection
      .delete(productOptionVariantLink)
      .where(
        and(
          eq(productOptionVariantLink.projectId, this.projectId),
          eq(productOptionVariantLink.variantId, variantId)
        )
      );
  }

  async findVariantLinks(
    variantIds: string[]
  ): Promise<Map<string, ProductOptionVariantLink[]>> {
    if (variantIds.length === 0) return new Map();

    const results = await this.connection
      .select()
      .from(productOptionVariantLink)
      .where(
        and(
          eq(productOptionVariantLink.projectId, this.projectId),
          inArray(productOptionVariantLink.variantId, variantIds)
        )
      );

    const map = new Map<string, ProductOptionVariantLink[]>();
    for (const link of results) {
      const existing = map.get(link.variantId) ?? [];
      existing.push(link);
      map.set(link.variantId, existing);
    }
    return map;
  }

  // ============ Loader ============

  async getTranslationsByOptionIds(
    optionIds: readonly string[]
  ): Promise<ProductOptionTranslation[]> {
    return this.connection
      .select()
      .from(productOptionTranslation)
      .where(
        and(
          eq(productOptionTranslation.projectId, this.projectId),
          inArray(productOptionTranslation.optionId, [...optionIds]),
          eq(productOptionTranslation.locale, this.locale)
        )
      );
  }

  async getValueIdsByOptionIds(
    optionIds: readonly string[]
  ): Promise<Array<{ id: string; optionId: string; sortIndex: number }>> {
    return this.connection
      .select({
        id: productOptionValue.id,
        optionId: productOptionValue.optionId,
        sortIndex: productOptionValue.sortIndex,
      })
      .from(productOptionValue)
      .where(
        and(
          eq(productOptionValue.projectId, this.projectId),
          inArray(productOptionValue.optionId, [...optionIds])
        )
      );
  }

  async getValuesByIds(valueIds: readonly string[]): Promise<ProductOptionValue[]> {
    return this.connection
      .select()
      .from(productOptionValue)
      .where(
        and(
          eq(productOptionValue.projectId, this.projectId),
          inArray(productOptionValue.id, [...valueIds])
        )
      );
  }

  async getValueTranslationsByValueIds(
    optionValueIds: readonly string[]
  ): Promise<ProductOptionValueTranslation[]> {
    return this.connection
      .select()
      .from(productOptionValueTranslation)
      .where(
        and(
          eq(productOptionValueTranslation.projectId, this.projectId),
          inArray(productOptionValueTranslation.optionValueId, [...optionValueIds]),
          eq(productOptionValueTranslation.locale, this.locale)
        )
      );
  }
}
