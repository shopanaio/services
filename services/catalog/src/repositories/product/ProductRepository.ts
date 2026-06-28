import { and, asc, eq, inArray, isNull, count } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  createQuery,
  createRelayQuery,
  type PageInfo,
  type InferExecuteOptions,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import {
  product,
  productCategory,
  listingListView,
  productListView,
  productTranslation,
  productOption,
  productFeature,
  type Product,
  type NewProduct,
  type ProductTranslation,
  type ProductOption,
  type ProductFeature,
} from "../models/index.js";
import {
  decodeCategoryGlobalId,
  decodeProductGlobalId,
  decodeVendorGlobalId,
} from "../global-id-where-mappers.js";
import type { NormalizedProductCategoriesScope } from "./ProductCategoriesScope.js";

const productQuery = createQuery(product).maxLimit(100).defaultLimit(20);

export const listingRelayQuery = createRelayQuery(
  createQuery(listingListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeProductGlobalId,
      vendorId: decodeVendorGlobalId,
      primaryCategoryId: decodeCategoryGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "listing", tieBreaker: "id" }
);

export const productRelayQuery = createRelayQuery(
  createQuery(productListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeProductGlobalId,
      vendorId: decodeVendorGlobalId,
      primaryCategoryId: decodeCategoryGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "product", tieBreaker: "id" }
);

export type ProductQueryInput = InferExecuteOptions<typeof productQuery>;
export type ListingRelayInput = InferRelayInput<typeof listingRelayQuery>;
export type ProductRelayInput = InferRelayInput<typeof productRelayQuery>;
export type ProductConnectionMetaInput = {
  categoriesScope?: NormalizedProductCategoriesScope;
};
export type ProductConnectionInput = ProductRelayInput & {
  meta?: ProductConnectionMetaInput;
};

const EMPTY_PRODUCT_WHERE: ProductRelayInput["where"] = {
  id: { _in: ["00000000-0000-0000-0000-000000000000"] },
};

export interface ProductConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class ProductRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? this.ctx.store.defaultLocale;
  }

  private get currency(): string {
    return this.ctx.currency ?? "UAH";
  }

  // ============ CRUD ============

  async exists(id: string): Promise<boolean> {
    const result = await this.connection
      .select({ id: product.id })
      .from(product)
      .where(
        and(
          eq(product.projectId, this.storeId),
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
          eq(product.projectId, this.storeId),
          eq(product.id, id),
          isNull(product.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(
    data: { vendorId?: string | null; publishedAt?: Date | string | null } = {}
  ): Promise<Product> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const newProduct: NewProduct = {
      projectId: this.storeId,
      id,
      vendorId: data.vendorId ?? null,
      publishedAt: data.publishedAt instanceof Date ? data.publishedAt.toISOString() : data.publishedAt ?? null,
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
      .set({ updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(product.projectId, this.storeId),
          eq(product.id, id)
        )
      );
  }

  async update(
    id: string,
    data: {
      handle?: string | null;
      vendorId?: string | null;
      publishedAt?: Date | string | null;
    }
  ): Promise<Product | null> {
    const updateData: Partial<NewProduct> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.handle !== undefined) updateData.handle = data.handle;
    if (data.vendorId !== undefined) updateData.vendorId = data.vendorId;
    if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt instanceof Date ? data.publishedAt.toISOString() : data.publishedAt;

    const result = await this.connection
      .update(product)
      .set(updateData)
      .where(
        and(
          eq(product.projectId, this.storeId),
          eq(product.id, id)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await this.connection
      .update(product)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(product.projectId, this.storeId),
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
          eq(product.projectId, this.storeId),
          eq(product.id, id)
        )
      )
      .returning({ id: product.id });

    return result.length > 0;
  }

  async publish(id: string): Promise<Product | null> {
    const now = new Date().toISOString();
    const result = await this.connection
      .update(product)
      .set({ publishedAt: now, updatedAt: now })
      .where(
        and(
          eq(product.projectId, this.storeId),
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
      .set({ publishedAt: null, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(product.projectId, this.storeId),
          eq(product.id, id),
          isNull(product.deletedAt)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  // ============ Query ============

  async count(): Promise<number> {
    const result = await this.connection
      .select({ count: count() })
      .from(product)
      .where(
        and(
          eq(product.projectId, this.storeId),
          isNull(product.deletedAt)
        )
      );
    return result[0]?.count ?? 0;
  }

  async getConnection(args: ProductConnectionInput): Promise<ProductConnectionResult> {
    const { where, orderBy, meta, ...paginationArgs } = args;
    const categoriesScopeWhere = await this.buildCategoriesScopeWhere(
      meta?.categoriesScope
    );

    // Scope list view rows to current tenant, locale, and currency.
    const mergedWhere: ProductRelayInput["where"] = {
      _and: [
        { projectId: { _eq: this.storeId } },
        { deletedAt: { _is: null } },
        { locale: { _eq: this.locale } },
        {
          _or: [
            { currency: { _eq: this.currency } },
            { currency: { _is: null } },
          ],
        },
        ...(where ? [where] : []),
        ...(categoriesScopeWhere ? [categoriesScopeWhere] : []),
      ],
    };

    const executeInput: ProductRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      productRelayQuery.execute(this.connection, executeInput),
      productRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);

    return {
      edges: result.edges.map((edge) => ({
        cursor: edge.cursor,
        nodeId: edge.node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  private async buildCategoriesScopeWhere(
    scope: NormalizedProductCategoriesScope | undefined,
  ): Promise<ProductRelayInput["where"] | undefined> {
    if (!scope) {
      return undefined;
    }

    if (scope.kind === "empty") {
      return EMPTY_PRODUCT_WHERE;
    }

    const rows = await this.connection
      .select({ productId: productCategory.productId })
      .from(productCategory)
      .where(
        and(
          eq(productCategory.projectId, this.storeId),
          inArray(productCategory.categoryId, scope.referenceIds)
        )
      );

    const productIds = [...new Set(rows.map((row) => row.productId))];
    if (productIds.length === 0) {
      return scope.mode === "EXCLUDE" ? undefined : EMPTY_PRODUCT_WHERE;
    }

    return scope.mode === "EXCLUDE"
      ? { id: { _notIn: productIds } }
      : { id: { _in: productIds } };
  }

  async getMany(input?: ProductQueryInput): Promise<Product[]> {
    return productQuery.execute(this.connection, {
      ...input,
      order: input?.order ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
      where: {
        ...input?.where,
        projectId: { _eq: this.storeId },
        deletedAt: { _is: null },
      },
    });
  }

  async getOne(id: string): Promise<Product | null> {
    const results = await productQuery.execute(this.connection, {
      where: {
        id: { _eq: id },
        projectId: { _eq: this.storeId },
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
          eq(product.projectId, this.storeId),
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
          eq(productTranslation.projectId, this.storeId),
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
          eq(productOption.projectId, this.storeId),
          inArray(productOption.productId, [...productIds])
        )
      )
      .orderBy(
        asc(productOption.productId),
        asc(productOption.sortIndex),
        asc(productOption.id)
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
          eq(productFeature.projectId, this.storeId),
          inArray(productFeature.productId, [...productIds])
        )
      );
  }

  async getRootFeatureIdsByProductIds(
    productIds: readonly string[]
  ): Promise<Array<{ id: string; productId: string; index: number[] }>> {
    return this.connection
      .select({
        id: productFeature.id,
        productId: productFeature.productId,
        index: productFeature.index,
      })
      .from(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.storeId),
          inArray(productFeature.productId, [...productIds]),
          isNull(productFeature.parentId)
        )
      )
      .orderBy(productFeature.index);
  }

  async getOptionsByIds(optionIds: readonly string[]): Promise<ProductOption[]> {
    return this.connection
      .select()
      .from(productOption)
      .where(
        and(
          eq(productOption.projectId, this.storeId),
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
          eq(productFeature.projectId, this.storeId),
          inArray(productFeature.id, [...featureIds])
        )
      );
  }
}
