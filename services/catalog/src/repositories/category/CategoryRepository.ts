import { and, eq, inArray, isNull, count, sql, asc, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { PageInfo } from "@shopana/drizzle-query";
import type { TransactionManager } from "@shopana/shared-kernel";
import { getContext, type ServiceContext } from "../../context/index.js";
import type { Database } from "../../infrastructure/db/database";
import {
  category,
  categoryMedia,
  categoryTranslation,
  productCategory,
  type Category,
  type NewCategory,
  type CategoryMedia,
  type CategoryTranslation,
  type ProductCategory,
  type NewProductCategory,
} from "../models/index.js";
import { initialRank, nextRank, rebalanceRanks } from "../../scripts/shared/rank.js";

export interface CategoryRelayInput {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  parentId?: string | null;
}

export interface CategoryConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class CategoryRepository {
  constructor(
    private readonly db: Database,
    private readonly txManager: TransactionManager<Database>
  ) {}

  private get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  private get ctx(): ServiceContext {
    return getContext();
  }

  private get storeId(): string {
    return this.ctx.store.id;
  }

  private get locale(): string {
    return this.ctx.locale ?? "uk";
  }

  // ============ CRUD ============

  async exists(id: string): Promise<boolean> {
    const result = await this.connection
      .select({ id: category.id })
      .from(category)
      .where(
        and(
          eq(category.projectId, this.storeId),
          eq(category.id, id),
          isNull(category.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  async findById(id: string): Promise<Category | null> {
    const result = await this.connection
      .select()
      .from(category)
      .where(
        and(
          eq(category.projectId, this.storeId),
          eq(category.id, id),
          isNull(category.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findByHandle(handle: string): Promise<Category | null> {
    const result = await this.connection
      .select()
      .from(category)
      .where(
        and(
          eq(category.projectId, this.storeId),
          eq(category.handle, handle),
          isNull(category.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: {
    handle: string;
    parentId?: string | null;
    publishedAt?: Date | string | null;
  }): Promise<Category> {
    const id = randomUUID();
    const now = new Date().toISOString();

    // Calculate path and depth
    let path = id;
    let depth = 0;

    if (data.parentId) {
      const parent = await this.findById(data.parentId);
      if (parent) {
        path = `${parent.path}.${id}`;
        depth = parent.depth + 1;
      }
    }

    const newCategory: NewCategory = {
      projectId: this.storeId,
      id,
      parentId: data.parentId ?? null,
      path,
      depth,
      handle: data.handle,
      publishedAt:
        data.publishedAt instanceof Date
          ? data.publishedAt.toISOString()
          : data.publishedAt ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const result = await this.connection
      .insert(category)
      .values(newCategory)
      .returning();

    return result[0];
  }

  async update(
    id: string,
    data: {
      handle?: string;
      publishedAt?: Date | string | null;
      defaultSort?: string;
      defaultSortDirection?: string;
    }
  ): Promise<Category | null> {
    const updateData: Partial<NewCategory> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.handle !== undefined) updateData.handle = data.handle;
    if (data.publishedAt !== undefined)
      updateData.publishedAt =
        data.publishedAt instanceof Date
          ? data.publishedAt.toISOString()
          : data.publishedAt;
    if (data.defaultSort !== undefined) updateData.defaultSort = data.defaultSort;
    if (data.defaultSortDirection !== undefined)
      updateData.defaultSortDirection = data.defaultSortDirection;

    const result = await this.connection
      .update(category)
      .set(updateData)
      .where(and(eq(category.projectId, this.storeId), eq(category.id, id)))
      .returning();

    return result[0] ?? null;
  }

  async move(id: string, newParentId: string | null): Promise<Category | null> {
    const cat = await this.findById(id);
    if (!cat) return null;

    let newPath = id;
    let newDepth = 0;

    if (newParentId) {
      const newParent = await this.findById(newParentId);
      if (newParent) {
        newPath = `${newParent.path}.${id}`;
        newDepth = newParent.depth + 1;
      }
    }

    const result = await this.connection
      .update(category)
      .set({
        parentId: newParentId,
        path: newPath,
        depth: newDepth,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(category.projectId, this.storeId), eq(category.id, id)))
      .returning();

    // Update paths of all descendants
    if (result[0]) {
      const oldPath = cat.path;
      await this.connection.execute(
        sql`UPDATE inventory.category
            SET path = ${newPath} || substr(path, ${oldPath.length + 1}),
                depth = depth + ${newDepth - cat.depth},
                updated_at = now()
            WHERE project_id = ${this.storeId}
              AND path LIKE ${oldPath + ".%"}`
      );
    }

    return result[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await this.connection
      .update(category)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(category.projectId, this.storeId),
          eq(category.id, id),
          isNull(category.deletedAt)
        )
      )
      .returning({ id: category.id });

    return result.length > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(category)
      .where(and(eq(category.projectId, this.storeId), eq(category.id, id)))
      .returning({ id: category.id });

    return result.length > 0;
  }

  async publish(id: string): Promise<Category | null> {
    const now = new Date().toISOString();
    const result = await this.connection
      .update(category)
      .set({ publishedAt: now, updatedAt: now })
      .where(
        and(
          eq(category.projectId, this.storeId),
          eq(category.id, id),
          isNull(category.deletedAt)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  async unpublish(id: string): Promise<Category | null> {
    const result = await this.connection
      .update(category)
      .set({ publishedAt: null, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(category.projectId, this.storeId),
          eq(category.id, id),
          isNull(category.deletedAt)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  // ============ Query ============

  async count(): Promise<number> {
    const result = await this.connection
      .select({ count: count() })
      .from(category)
      .where(
        and(eq(category.projectId, this.storeId), isNull(category.deletedAt))
      );
    return result[0]?.count ?? 0;
  }

  async getMany(options?: {
    limit?: number;
    offset?: number;
    parentId?: string | null;
  }): Promise<Category[]> {
    let query = this.connection
      .select()
      .from(category)
      .where(
        and(eq(category.projectId, this.storeId), isNull(category.deletedAt))
      )
      .orderBy(desc(category.createdAt), desc(category.id));

    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }
    if (options?.offset) {
      query = query.offset(options.offset) as typeof query;
    }

    return query;
  }

  async getConnection(args: CategoryRelayInput): Promise<CategoryConnectionResult> {
    const first = args.first ?? 20;
    const limit = first + 1; // Fetch one extra to check for next page

    const categories = await this.connection
      .select()
      .from(category)
      .where(
        and(
          eq(category.projectId, this.storeId),
          isNull(category.deletedAt),
          args.parentId !== undefined
            ? args.parentId === null
              ? isNull(category.parentId)
              : eq(category.parentId, args.parentId)
            : undefined
        )
      )
      .orderBy(desc(category.createdAt), desc(category.id))
      .limit(limit);

    const hasNextPage = categories.length > first;
    const resultCategories = hasNextPage ? categories.slice(0, first) : categories;

    const edges = resultCategories.map((cat) => ({
      cursor: Buffer.from(cat.id).toString("base64"),
      nodeId: cat.id,
    }));

    const totalCount = await this.count();

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: false,
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
      },
      totalCount,
    };
  }

  async getOne(id: string): Promise<Category | null> {
    const result = await this.connection
      .select()
      .from(category)
      .where(
        and(
          eq(category.projectId, this.storeId),
          eq(category.id, id),
          isNull(category.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async getRootCategories(): Promise<Category[]> {
    return this.connection
      .select()
      .from(category)
      .where(
        and(
          eq(category.projectId, this.storeId),
          isNull(category.parentId),
          isNull(category.deletedAt)
        )
      )
      .orderBy(asc(category.handle));
  }

  // ============ Loader ============

  async getByIds(categoryIds: readonly string[]): Promise<Category[]> {
    if (categoryIds.length === 0) return [];
    return this.connection
      .select()
      .from(category)
      .where(
        and(
          eq(category.projectId, this.storeId),
          inArray(category.id, [...categoryIds]),
          isNull(category.deletedAt)
        )
      );
  }

  async getChildrenByParentIds(
    parentIds: readonly string[]
  ): Promise<Category[]> {
    if (parentIds.length === 0) return [];
    return this.connection
      .select()
      .from(category)
      .where(
        and(
          eq(category.projectId, this.storeId),
          inArray(category.parentId, [...parentIds]),
          isNull(category.deletedAt)
        )
      )
      .orderBy(asc(category.handle));
  }

  async getAncestorIdsByIds(
    categoryIds: readonly string[]
  ): Promise<Map<string, string[]>> {
    const categories = await this.getByIds(categoryIds);
    const result = new Map<string, string[]>();

    for (const cat of categories) {
      // Parse path to get ancestor IDs (excluding self)
      const pathParts = cat.path.split(".");
      const ancestorIds = pathParts.slice(0, -1); // All except last (self)
      result.set(cat.id, ancestorIds);
    }

    return result;
  }

  async getTranslationsByCategoryIds(
    categoryIds: readonly string[]
  ): Promise<CategoryTranslation[]> {
    if (categoryIds.length === 0) return [];
    return this.connection
      .select()
      .from(categoryTranslation)
      .where(
        and(
          eq(categoryTranslation.projectId, this.storeId),
          inArray(categoryTranslation.categoryId, [...categoryIds]),
          eq(categoryTranslation.locale, this.locale)
        )
      );
  }

  async getMediaByCategoryIds(
    categoryIds: readonly string[]
  ): Promise<CategoryMedia[]> {
    if (categoryIds.length === 0) return [];
    return this.connection
      .select()
      .from(categoryMedia)
      .where(
        and(
          eq(categoryMedia.projectId, this.storeId),
          inArray(categoryMedia.categoryId, [...categoryIds])
        )
      )
      .orderBy(asc(categoryMedia.sortIndex));
  }

  // ============ Product-Category Relations ============

  async getProductCategoriesByProductIds(
    productIds: readonly string[]
  ): Promise<ProductCategory[]> {
    if (productIds.length === 0) return [];
    return this.connection
      .select()
      .from(productCategory)
      .where(
        and(
          eq(productCategory.projectId, this.storeId),
          inArray(productCategory.productId, [...productIds])
        )
      );
  }

  async getProductCategoriesByCategoryIds(
    categoryIds: readonly string[]
  ): Promise<ProductCategory[]> {
    if (categoryIds.length === 0) return [];
    return this.connection
      .select()
      .from(productCategory)
      .where(
        and(
          eq(productCategory.projectId, this.storeId),
          inArray(productCategory.categoryId, [...categoryIds])
        )
      );
  }

  async countProductsByCategoryIds(
    categoryIds: readonly string[]
  ): Promise<Map<string, number>> {
    if (categoryIds.length === 0) return new Map();
    const results = await this.connection
      .select({
        categoryId: productCategory.categoryId,
        count: count(),
      })
      .from(productCategory)
      .where(
        and(
          eq(productCategory.projectId, this.storeId),
          inArray(productCategory.categoryId, [...categoryIds])
        )
      )
      .groupBy(productCategory.categoryId);

    return new Map(results.map((r) => [r.categoryId, r.count]));
  }

  async getProductIdsByCategoryId(
    categoryId: string,
    options?: { first?: number; offset?: number }
  ): Promise<string[]> {
    const first = options?.first ?? 20;
    const offset = options?.offset ?? 0;

    const results = await this.connection
      .select({ productId: productCategory.productId })
      .from(productCategory)
      .where(
        and(
          eq(productCategory.projectId, this.storeId),
          eq(productCategory.categoryId, categoryId)
        )
      )
      .orderBy(asc(productCategory.lexoRank))
      .limit(first)
      .offset(offset);

    return results.map((r) => r.productId);
  }

  async addProductToCategory(
    productId: string,
    categoryId: string,
    isPrimary: boolean = false
  ): Promise<ProductCategory> {
    const rank = await this.getNextCategoryProductRank(categoryId);

    const data: NewProductCategory = {
      projectId: this.storeId,
      productId,
      categoryId,
      isPrimary,
      lexoRank: rank,
    };

    const result = await this.connection
      .insert(productCategory)
      .values(data)
      .onConflictDoUpdate({
        target: [productCategory.productId, productCategory.categoryId],
        set: { isPrimary, lexoRank: rank },
      })
      .returning();

    return result[0];
  }

  async removeProductFromCategory(
    productId: string,
    categoryId: string
  ): Promise<boolean> {
    const result = await this.connection
      .delete(productCategory)
      .where(
        and(
          eq(productCategory.projectId, this.storeId),
          eq(productCategory.productId, productId),
          eq(productCategory.categoryId, categoryId)
        )
      )
      .returning({ productId: productCategory.productId });

    return result.length > 0;
  }

  async setProductCategories(
    productId: string,
    categoryIds: string[],
    primaryCategoryId?: string
  ): Promise<void> {
    // Delete existing
    await this.connection
      .delete(productCategory)
      .where(
        and(
          eq(productCategory.projectId, this.storeId),
          eq(productCategory.productId, productId)
        )
      );

    // Insert new
    if (categoryIds.length > 0) {
      const values: NewProductCategory[] = categoryIds.map((categoryId) => ({
        projectId: this.storeId,
        productId,
        categoryId,
        isPrimary: categoryId === primaryCategoryId,
        lexoRank: initialRank(),
      }));

      await this.connection.insert(productCategory).values(values);
    }
  }

  async getProductCategory(
    categoryId: string,
    productId: string
  ): Promise<ProductCategory | null> {
    const rows = await this.connection
      .select()
      .from(productCategory)
      .where(
        and(
          eq(productCategory.projectId, this.storeId),
          eq(productCategory.categoryId, categoryId),
          eq(productCategory.productId, productId)
        )
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async getOrderedCategoryProducts(categoryId: string): Promise<ProductCategory[]> {
    return this.connection
      .select()
      .from(productCategory)
      .where(
        and(
          eq(productCategory.projectId, this.storeId),
          eq(productCategory.categoryId, categoryId)
        )
      )
      .orderBy(asc(productCategory.lexoRank), asc(productCategory.productId));
  }

  async updateProductCategoryRank(
    categoryId: string,
    productId: string,
    lexoRank: string
  ): Promise<ProductCategory | null> {
    const rows = await this.connection
      .update(productCategory)
      .set({ lexoRank })
      .where(
        and(
          eq(productCategory.projectId, this.storeId),
          eq(productCategory.categoryId, categoryId),
          eq(productCategory.productId, productId)
        )
      )
      .returning();

    return rows[0] ?? null;
  }

  async rebalanceCategoryProductRanks(categoryId: string): Promise<void> {
    const items = await this.getOrderedCategoryProducts(categoryId);
    const ranks = rebalanceRanks(items.length);

    for (let i = 0; i < items.length; i++) {
      await this.updateProductCategoryRank(categoryId, items[i].productId, ranks[i]);
    }
  }

  async updateSortPreferences(
    categoryId: string,
    defaultSort: string,
    defaultSortDirection: string
  ): Promise<Category | null> {
    return this.update(categoryId, { defaultSort, defaultSortDirection });
  }

  // ============ Translation ============

  async upsertTranslation(data: {
    projectId: string;
    categoryId: string;
    locale: string;
    name: string;
    descriptionText?: string | null;
    descriptionHtml?: string | null;
    descriptionJson?: string | null;
  }): Promise<CategoryTranslation> {
    const result = await this.connection
      .insert(categoryTranslation)
      .values({
        projectId: data.projectId,
        categoryId: data.categoryId,
        locale: data.locale,
        name: data.name,
        descriptionText: data.descriptionText ?? null,
        descriptionHtml: data.descriptionHtml ?? null,
        descriptionJson: data.descriptionJson ?? null,
      })
      .onConflictDoUpdate({
        target: [categoryTranslation.categoryId, categoryTranslation.locale],
        set: {
          name: data.name,
          descriptionText: data.descriptionText ?? null,
          descriptionHtml: data.descriptionHtml ?? null,
          descriptionJson: data.descriptionJson ?? null,
        },
      })
      .returning();

    return result[0];
  }

  // ============ Media ============

  async setMedia(categoryId: string, fileIds: string[]): Promise<void> {
    // Delete existing media
    await this.connection
      .delete(categoryMedia)
      .where(
        and(
          eq(categoryMedia.projectId, this.storeId),
          eq(categoryMedia.categoryId, categoryId)
        )
      );

    // Insert new media
    if (fileIds.length > 0) {
      const values = fileIds.map((fileId, index) => ({
        projectId: this.storeId,
        categoryId,
        fileId,
        sortIndex: index,
      }));

      await this.connection.insert(categoryMedia).values(values);
    }
  }

  private async getNextCategoryProductRank(categoryId: string): Promise<string> {
    const rows = await this.connection
      .select({ lexoRank: productCategory.lexoRank })
      .from(productCategory)
      .where(
        and(
          eq(productCategory.projectId, this.storeId),
          eq(productCategory.categoryId, categoryId)
        )
      )
      .orderBy(desc(productCategory.lexoRank))
      .limit(1);

    if (rows.length === 0) {
      return initialRank();
    }

    return nextRank(rows[0].lexoRank);
  }
}
