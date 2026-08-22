import { and, asc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import {
  collection,
  collectionTranslation,
  collectionSeo,
  collectionMedia,
  type Collection,
  type NewCollection,
  type CollectionTranslation,
  type NewCollectionTranslation,
  type CollectionSeo,
  type NewCollectionSeo,
  type CollectionMedia,
} from "../models/index.js";

export const collectionRelayQuery = createRelayQuery(
  createQuery(collection).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "collection", tieBreaker: "id" },
);

export type CollectionRelayInput = InferRelayInput<typeof collectionRelayQuery>;

export interface CollectionConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class CollectionRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? this.ctx.store.defaultLocale;
  }

  async currentTimestamp(): Promise<string> {
    const rows = await this.connection.execute<{ value: string }>(sql`
      SELECT now()::text AS value
    `);
    const value = rows[0]?.value;
    if (!value) throw new Error("Database clock did not return a timestamp");
    return new Date(value).toISOString();
  }

  async findById(id: string): Promise<Collection | null> {
    const rows = await this.connection
      .select()
      .from(collection)
      .where(
        and(
          eq(collection.storeId, this.storeId),
          eq(collection.id, id),
          isNull(collection.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findByIdIncludingDeleted(id: string): Promise<Collection | null> {
    const rows = await this.connection
      .select()
      .from(collection)
      .where(and(eq(collection.storeId, this.storeId), eq(collection.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByIdForUpdate(id: string): Promise<Collection | null> {
    const rows = await this.connection
      .select()
      .from(collection)
      .where(
        and(
          eq(collection.storeId, this.storeId),
          eq(collection.id, id),
          isNull(collection.deletedAt),
        ),
      )
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  async findByHandle(handle: string): Promise<Collection | null> {
    const rows = await this.connection
      .select()
      .from(collection)
      .where(
        and(
          eq(collection.storeId, this.storeId),
          eq(collection.handle, handle),
          isNull(collection.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findVisibleById(id: string): Promise<Collection | null> {
    return this.findVisible(sql`${collection.id} = ${id}::uuid`);
  }

  async findVisibleByHandle(handle: string): Promise<Collection | null> {
    return this.findVisible(sql`${collection.handle} = ${handle}`);
  }

  async findAll(): Promise<Collection[]> {
    return this.connection
      .select()
      .from(collection)
      .where(and(eq(collection.storeId, this.storeId), isNull(collection.deletedAt)))
      .orderBy(asc(collection.createdAt));
  }

  async getConnection(args: CollectionRelayInput): Promise<CollectionConnectionResult> {
    const { where, orderBy, ...paginationArgs } = args;
    const mergedWhere: CollectionRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { deletedAt: { _is: null } },
        ...(where ? [where] : []),
      ],
    };
    const executeInput: CollectionRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      collectionRelayQuery.execute(this.connection, executeInput),
      collectionRelayQuery.count(this.connection, { where: mergedWhere }),
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

  private async findVisible(predicate: SQL): Promise<Collection | null> {
    const rows = await this.connection
      .select()
      .from(collection)
      .where(
        and(
          eq(collection.storeId, this.storeId),
          isNull(collection.deletedAt),
          predicate,
          sql`${collection.handle} <> ''`,
          sql`${collection.publishedAt} IS NOT NULL`,
          sql`${collection.publishedAt} <= now()`,
          sql`(${collection.effectiveFrom} IS NULL OR ${collection.effectiveFrom} <= now())`,
          sql`(${collection.effectiveTo} IS NULL OR ${collection.effectiveTo} > now())`,
          sql`EXISTS (
            SELECT 1
            FROM catalog.collection_translation visible_translation
            WHERE visible_translation.store_id = ${collection.storeId}
              AND visible_translation.collection_id = ${collection.id}
              AND visible_translation.locale = ${this.ctx.store.defaultLocale}
              AND btrim(visible_translation.name) <> ''
          )`,
          sql`(
            ${collection.type} <> 'rule'
            OR EXISTS (
              SELECT 1
              FROM catalog.collection_rule visible_rule
              WHERE visible_rule.store_id = ${collection.storeId}
                AND visible_rule.collection_id = ${collection.id}
            )
          )`,
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async getByIds(ids: readonly string[]): Promise<Collection[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(collection)
      .where(
        and(
          eq(collection.storeId, this.storeId),
          inArray(collection.id, [...ids]),
          isNull(collection.deletedAt),
        ),
      );
  }

  async create(data: {
    handle?: string | null;
    type: "manual" | "rule";
    defaultSort: string;
    defaultSortDirection: string;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    publishedAt?: string | null;
  }): Promise<Collection> {
    const now = new Date().toISOString();
    const insert: NewCollection = {
      id: await this.generateUuidV7(),
      storeId: this.storeId,
      handle: data.handle ?? null,
      type: data.type,
      defaultSort: data.defaultSort,
      defaultSortDirection: data.defaultSortDirection,
      effectiveFrom: data.effectiveFrom ?? null,
      effectiveTo: data.effectiveTo ?? null,
      publishedAt: data.publishedAt ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const rows = await this.connection.insert(collection).values(insert).returning();
    return rows[0];
  }

  async update(
    id: string,
    data: {
      handle?: string | null;
      defaultSort?: string;
      defaultSortDirection?: string;
      effectiveFrom?: string | null;
      effectiveTo?: string | null;
      publishedAt?: string | null;
    },
    options: { listingChanged: boolean },
  ): Promise<Collection | null> {
    const now = new Date().toISOString();
    const updates: Omit<Partial<NewCollection>, "listingUpdatedAt"> & {
      listingUpdatedAt?: SQL;
    } = {
      updatedAt: now,
    };
    if (options.listingChanged) {
      updates.listingUpdatedAt = sql`now()`;
    }
    if (data.handle !== undefined) updates.handle = data.handle;
    if (data.defaultSort !== undefined) updates.defaultSort = data.defaultSort;
    if (data.defaultSortDirection !== undefined)
      updates.defaultSortDirection = data.defaultSortDirection;
    if (data.effectiveFrom !== undefined) updates.effectiveFrom = data.effectiveFrom;
    if (data.effectiveTo !== undefined) updates.effectiveTo = data.effectiveTo;
    if (data.publishedAt !== undefined) updates.publishedAt = data.publishedAt;

    const rows = await this.connection
      .update(collection)
      .set(updates)
      .where(
        and(
          eq(collection.storeId, this.storeId),
          eq(collection.id, id),
          isNull(collection.deletedAt),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async markChanged(id: string, options: { listingChanged: boolean }): Promise<Collection | null> {
    return this.update(id, {}, options);
  }

  async softDelete(id: string): Promise<Collection | null> {
    const rows = await this.connection
      .update(collection)
      .set({
        deletedAt: sql`now()`,
        updatedAt: sql`now()`,
        listingUpdatedAt: sql`now()`,
      })
      .where(
        and(
          eq(collection.storeId, this.storeId),
          eq(collection.id, id),
          isNull(collection.deletedAt),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async upsertTranslation(data: {
    collectionId: string;
    name: string;
    descriptionText?: string | null;
    descriptionHtml?: string | null;
    descriptionJson?: string | null;
    excerptText?: string | null;
    excerptHtml?: string | null;
    excerptJson?: string | null;
  }): Promise<CollectionTranslation> {
    const insert: NewCollectionTranslation = {
      collectionId: data.collectionId,
      locale: this.locale,
      storeId: this.storeId,
      name: data.name,
      descriptionText: data.descriptionText ?? null,
      descriptionHtml: data.descriptionHtml ?? null,
      descriptionJson: data.descriptionJson ?? null,
      excerptText: data.excerptText ?? null,
      excerptHtml: data.excerptHtml ?? null,
      excerptJson: data.excerptJson ?? null,
    };

    const rows = await this.connection
      .insert(collectionTranslation)
      .values(insert)
      .onConflictDoUpdate({
        target: [collectionTranslation.collectionId, collectionTranslation.locale],
        set: {
          name: insert.name,
          descriptionText: insert.descriptionText,
          descriptionHtml: insert.descriptionHtml,
          descriptionJson: insert.descriptionJson,
          excerptText: insert.excerptText,
          excerptHtml: insert.excerptHtml,
          excerptJson: insert.excerptJson,
        },
      })
      .returning();
    return rows[0];
  }

  async getTranslationsByCollectionIds(
    collectionIds: readonly string[],
  ): Promise<CollectionTranslation[]> {
    if (collectionIds.length === 0) return [];
    return this.connection
      .select()
      .from(collectionTranslation)
      .where(
        and(
          eq(collectionTranslation.storeId, this.storeId),
          eq(collectionTranslation.locale, this.locale),
          inArray(collectionTranslation.collectionId, [...collectionIds]),
        ),
      );
  }

  async findDefaultTranslation(collectionId: string): Promise<CollectionTranslation | null> {
    const rows = await this.connection
      .select()
      .from(collectionTranslation)
      .where(
        and(
          eq(collectionTranslation.storeId, this.storeId),
          eq(collectionTranslation.collectionId, collectionId),
          eq(collectionTranslation.locale, this.ctx.store.defaultLocale),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertSeo(data: {
    collectionId: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    ogImageId?: string | null;
  }): Promise<CollectionSeo> {
    const insert: NewCollectionSeo = {
      collectionId: data.collectionId,
      locale: this.locale,
      storeId: this.storeId,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      ogTitle: data.ogTitle ?? null,
      ogDescription: data.ogDescription ?? null,
      ogImageId: data.ogImageId ?? null,
    };

    const rows = await this.connection
      .insert(collectionSeo)
      .values(insert)
      .onConflictDoUpdate({
        target: [collectionSeo.collectionId, collectionSeo.locale],
        set: {
          seoTitle: insert.seoTitle,
          seoDescription: insert.seoDescription,
          ogTitle: insert.ogTitle,
          ogDescription: insert.ogDescription,
          ogImageId: insert.ogImageId,
        },
      })
      .returning();
    return rows[0];
  }

  async getSeoByCollectionIds(collectionIds: readonly string[]): Promise<CollectionSeo[]> {
    if (collectionIds.length === 0) return [];
    return this.connection
      .select()
      .from(collectionSeo)
      .where(
        and(
          eq(collectionSeo.storeId, this.storeId),
          eq(collectionSeo.locale, this.locale),
          inArray(collectionSeo.collectionId, [...collectionIds]),
        ),
      );
  }

  async setMedia(collectionId: string, fileIds: string[]): Promise<void> {
    await this.connection
      .delete(collectionMedia)
      .where(
        and(
          eq(collectionMedia.storeId, this.storeId),
          eq(collectionMedia.collectionId, collectionId),
        ),
      );

    if (fileIds.length === 0) {
      return;
    }

    await this.connection.insert(collectionMedia).values(
      fileIds.map((fileId, index) => ({
        collectionId,
        fileId,
        storeId: this.storeId,
        sortIndex: index,
      })),
    );
  }

  async getMediaByCollectionIds(collectionIds: readonly string[]): Promise<CollectionMedia[]> {
    if (collectionIds.length === 0) return [];
    return this.connection
      .select()
      .from(collectionMedia)
      .where(
        and(
          eq(collectionMedia.storeId, this.storeId),
          inArray(collectionMedia.collectionId, [...collectionIds]),
        ),
      )
      .orderBy(asc(collectionMedia.sortIndex));
  }
}
