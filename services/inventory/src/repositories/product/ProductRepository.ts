import { and, eq, inArray, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createQuery, type InferExecuteOptions } from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import {
  product,
  productTranslation,
  productOption,
  productFeature,
  type Product,
  type NewProduct,
  type ProductTranslation,
  type ProductOption,
  type ProductFeature,
} from "../models/index.js";

const productQuery = createQuery(product).maxLimit(100).defaultLimit(20);

export type ProductQueryInput = InferExecuteOptions<typeof productQuery>;

export class ProductRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? "uk";
  }

  // ============ CRUD ============

  async exists(id: string): Promise<boolean> {
    const result = await this.connection
      .select({ id: product.id })
      .from(product)
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id),
          isNull(product.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  async findById(id: string): Promise<Product | null> {
    const result = await this.connection
      .select()
      .from(product)
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id),
          isNull(product.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: { publishedAt?: Date | null } = {}): Promise<Product> {
    const id = randomUUID();
    const now = new Date();

    const newProduct: NewProduct = {
      projectId: this.projectId,
      id,
      publishedAt: data.publishedAt ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const result = await this.connection
      .insert(product)
      .values(newProduct)
      .returning();

    return result[0];
  }

  async touch(id: string): Promise<void> {
    await this.connection
      .update(product)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id)
        )
      );
  }

  async update(
    id: string,
    data: { handle?: string | null; publishedAt?: Date | null }
  ): Promise<Product | null> {
    const updateData: Partial<NewProduct> = {
      updatedAt: new Date(),
    };

    if (data.handle !== undefined) updateData.handle = data.handle;
    if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt;

    const result = await this.connection
      .update(product)
      .set(updateData)
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.connection
      .update(product)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id),
          isNull(product.deletedAt)
        )
      )
      .returning({ id: product.id });

    return result.length > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(product)
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id)
        )
      )
      .returning({ id: product.id });

    return result.length > 0;
  }

  async publish(id: string): Promise<Product | null> {
    const now = new Date();
    const result = await this.connection
      .update(product)
      .set({ publishedAt: now, updatedAt: now })
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id),
          isNull(product.deletedAt)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  async unpublish(id: string): Promise<Product | null> {
    const result = await this.connection
      .update(product)
      .set({ publishedAt: null, updatedAt: new Date() })
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id),
          isNull(product.deletedAt)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  // ============ Query ============

  async getMany(input?: ProductQueryInput): Promise<Product[]> {
    return productQuery.execute(this.connection, {
      ...input,
      order: input?.order ?? [
        { field: "createdAt", order: "desc" },
        { field: "id", order: "desc" },
      ],
      where: {
        ...input?.where,
        projectId: { _eq: this.projectId },
        deletedAt: { _is: null },
      },
    });
  }

  async getOne(id: string): Promise<Product | null> {
    const results = await productQuery.execute(this.connection, {
      where: {
        id: { _eq: id },
        projectId: { _eq: this.projectId },
        deletedAt: { _is: null },
      },
      limit: 1,
    });

    return results[0] ?? null;
  }

  // ============ Loader ============

  async getByIds(productIds: readonly string[]): Promise<Product[]> {
    return this.connection
      .select()
      .from(product)
      .where(
        and(
          eq(product.projectId, this.projectId),
          inArray(product.id, [...productIds]),
          isNull(product.deletedAt)
        )
      );
  }

  async getTranslationsByProductIds(
    productIds: readonly string[]
  ): Promise<ProductTranslation[]> {
    return this.connection
      .select()
      .from(productTranslation)
      .where(
        and(
          eq(productTranslation.projectId, this.projectId),
          inArray(productTranslation.productId, [...productIds]),
          eq(productTranslation.locale, this.locale)
        )
      );
  }

  async getOptionIdsByProductIds(
    productIds: readonly string[]
  ): Promise<Array<{ id: string; productId: string }>> {
    return this.connection
      .select({ id: productOption.id, productId: productOption.productId })
      .from(productOption)
      .where(
        and(
          eq(productOption.projectId, this.projectId),
          inArray(productOption.productId, [...productIds])
        )
      );
  }

  async getFeatureIdsByProductIds(
    productIds: readonly string[]
  ): Promise<Array<{ id: string; productId: string }>> {
    return this.connection
      .select({ id: productFeature.id, productId: productFeature.productId })
      .from(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.projectId),
          inArray(productFeature.productId, [...productIds])
        )
      );
  }

  async getOptionsByIds(optionIds: readonly string[]): Promise<ProductOption[]> {
    return this.connection
      .select()
      .from(productOption)
      .where(
        and(
          eq(productOption.projectId, this.projectId),
          inArray(productOption.id, [...optionIds])
        )
      );
  }

  async getFeaturesByIds(featureIds: readonly string[]): Promise<ProductFeature[]> {
    return this.connection
      .select()
      .from(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.projectId),
          inArray(productFeature.id, [...featureIds])
        )
      );
  }
}
