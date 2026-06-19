import {
  createCursorQuery,
  createQuery,
  createRelayQuery,
  type InferCursorInput,
  type InferExecuteOptions,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { randomUUID } from "crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  itemPricing,
  productOptionVariantLink,
  variant,
  variantTranslation,
  type ItemPricing,
  type NewVariant,
  type ProductOptionVariantLink,
  type Variant,
  type VariantTranslation,
} from "../models/index.js";

const variantQuery = createQuery(variant).maxLimit(100).defaultLimit(20);

const variantPaginationQuery = createCursorQuery(
  createQuery(variant).maxLimit(100).defaultLimit(20).include(["id"]),
  { tieBreaker: "id" }
);

const variantRelayQuery = createRelayQuery(
  createQuery(variant)
    .include(["id", "productId"])
    .maxLimit(100)
    .defaultLimit(20),
  { name: "variant", tieBreaker: "id" }
);

export type VariantQueryInput = InferExecuteOptions<typeof variantQuery>;
export type VariantCursorInput = InferCursorInput<
  typeof variantPaginationQuery
>;
export type VariantRelayInput = InferRelayInput<typeof variantRelayQuery>;

export interface VariantConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class VariantRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? "uk";
  }

  // ============ CRUD ============

  async exists(id: string): Promise<boolean> {
    const result = await this.connection
      .select({ id: variant.id })
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.storeId),
          eq(variant.id, id),
          isNull(variant.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  async findById(id: string): Promise<Variant | null> {
    const result = await this.connection
      .select()
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.storeId),
          eq(variant.id, id),
          isNull(variant.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findBySku(sku: string): Promise<Variant | null> {
    const result = await this.connection
      .select()
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.storeId),
          eq(variant.sku, sku),
          isNull(variant.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findByProductId(productId: string): Promise<Variant[]> {
    const result = await this.connection
      .select()
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.storeId),
          eq(variant.productId, productId),
          isNull(variant.deletedAt)
        )
      );

    return result;
  }

  async create(
    productId: string,
    data: {
      isDefault?: boolean;
      handle: string;
      sku?: string | null;
      externalSystem?: string | null;
      externalId?: string | null;
    }
  ): Promise<Variant> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const newVariant: NewVariant = {
      projectId: this.storeId,
      productId,
      id,
      isDefault: data.isDefault ?? false,
      handle: data.handle,
      sku: data.sku ?? null,
      externalSystem: data.externalSystem ?? null,
      externalId: data.externalId ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const result = await this.connection
      .insert(variant)
      .values(newVariant)
      .returning();

    return result[0];
  }

  async update(
    id: string,
    data: {
      sku?: string | null;
      handle?: string;
      externalSystem?: string | null;
      externalId?: string | null;
    }
  ): Promise<Variant | null> {
    const updateData: Partial<NewVariant> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.handle !== undefined) updateData.handle = data.handle;
    if (data.externalSystem !== undefined)
      updateData.externalSystem = data.externalSystem;
    if (data.externalId !== undefined) updateData.externalId = data.externalId;

    const result = await this.connection
      .update(variant)
      .set(updateData)
      .where(and(eq(variant.projectId, this.storeId), eq(variant.id, id)))
      .returning();

    return result[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await this.connection
      .update(variant)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(variant.projectId, this.storeId),
          eq(variant.id, id),
          isNull(variant.deletedAt)
        )
      )
      .returning({ id: variant.id });

    return result.length > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(variant)
      .where(and(eq(variant.projectId, this.storeId), eq(variant.id, id)))
      .returning({ id: variant.id });

    return result.length > 0;
  }

  // ============ Query ============

  async getMany(input?: VariantQueryInput): Promise<Variant[]> {
    return variantQuery.execute(this.connection, {
      ...input,
      where: {
        ...input?.where,
        projectId: { _eq: this.storeId },
        deletedAt: { _is: null },
      },
    });
  }

  async getOne(id: string): Promise<Variant | null> {
    const results = await variantQuery.execute(this.connection, {
      where: {
        id: { _eq: id },
        projectId: { _eq: this.storeId },
        deletedAt: { _is: null },
      },
      limit: 1,
    });

    return results[0] ?? null;
  }

  async getByProductId(
    productId: string,
    input?: Omit<VariantQueryInput, "where">
  ): Promise<Variant[]> {
    return variantQuery.execute(this.connection, {
      ...input,
      where: {
        productId: { _eq: productId },
        projectId: { _eq: this.storeId },
        deletedAt: { _is: null },
      },
    });
  }

  async getIdsByProductId(
    productId: string,
    args: VariantCursorInput
  ): Promise<string[]> {
    const result = await variantPaginationQuery.execute(this.connection, {
      ...args,
      where: {
        ...args.where,
        projectId: { _eq: this.storeId },
        productId: { _eq: productId },
        deletedAt: { _is: null },
      },
    });

    return result.items.map((item) => item.id);
  }

  async getConnectionByProductId(
    productId: string,
    args: VariantRelayInput
  ): Promise<VariantConnectionResult> {
    const { where, orderBy, ...paginationArgs } = args;

    const mergedWhere: VariantRelayInput["where"] = {
      _and: [
        { projectId: { _eq: this.storeId } },
        { productId: { _eq: productId } },
        { deletedAt: { _is: null } },
        ...(where ? [where] : []),
      ],
    };

    const executeInput: VariantRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy: orderBy ?? [{ field: "createdAt", direction: "desc" }],
    };

    const result = await variantRelayQuery.execute(
      this.connection,
      executeInput
    );

    return {
      edges: result.edges.map((edge) => ({
        cursor: edge.cursor,
        nodeId: edge.node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount: result.totalCount ?? 0,
    };
  }

  // ============ Loader ============

  async getByIds(variantIds: readonly string[]): Promise<Variant[]> {
    return this.connection
      .select()
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.storeId),
          inArray(variant.id, [...variantIds]),
          isNull(variant.deletedAt)
        )
      );
  }

  async getIdsByProductIds(
    productIds: readonly string[]
  ): Promise<Array<{ id: string; productId: string }>> {
    return this.connection
      .select({ id: variant.id, productId: variant.productId })
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.storeId),
          inArray(variant.productId, [...productIds]),
          isNull(variant.deletedAt)
        )
      );
  }

  async getTranslationsByVariantIds(
    variantIds: readonly string[]
  ): Promise<VariantTranslation[]> {
    return this.connection
      .select()
      .from(variantTranslation)
      .where(
        and(
          eq(variantTranslation.projectId, this.storeId),
          inArray(variantTranslation.variantId, [...variantIds]),
          eq(variantTranslation.locale, this.locale)
        )
      );
  }

  async getActivePricingByVariantIds(
    variantIds: readonly string[]
  ): Promise<ItemPricing[]> {
    return this.connection
      .select()
      .from(itemPricing)
      .where(
        and(
          eq(itemPricing.projectId, this.storeId),
          inArray(itemPricing.variantId, [...variantIds]),
          isNull(itemPricing.effectiveTo)
        )
      );
  }

  async getPricingByIds(priceIds: readonly string[]): Promise<ItemPricing[]> {
    return this.connection
      .select()
      .from(itemPricing)
      .where(
        and(
          eq(itemPricing.projectId, this.storeId),
          inArray(itemPricing.id, [...priceIds])
        )
      );
  }

  async getPriceIdsByVariantIds(
    variantIds: readonly string[]
  ): Promise<Array<{ id: string; variantId: string }>> {
    return this.connection
      .select({ id: itemPricing.id, variantId: itemPricing.variantId })
      .from(itemPricing)
      .where(
        and(
          eq(itemPricing.projectId, this.storeId),
          inArray(itemPricing.variantId, [...variantIds])
        )
      );
  }

  async getSelectedOptionsByVariantIds(
    variantIds: readonly string[]
  ): Promise<ProductOptionVariantLink[]> {
    return this.connection
      .select()
      .from(productOptionVariantLink)
      .where(
        and(
          eq(productOptionVariantLink.projectId, this.storeId),
          inArray(productOptionVariantLink.variantId, [...variantIds])
        )
      );
  }

}
