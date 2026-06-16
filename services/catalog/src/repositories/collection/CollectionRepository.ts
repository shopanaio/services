import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
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

export class CollectionRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? "uk";
  }

  async findById(id: string): Promise<Collection | null> {
    const rows = await this.connection
      .select()
      .from(collection)
      .where(
        and(
          eq(collection.projectId, this.storeId),
          eq(collection.id, id),
          isNull(collection.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findByHandle(handle: string): Promise<Collection | null> {
    const rows = await this.connection
      .select()
      .from(collection)
      .where(
        and(
          eq(collection.projectId, this.storeId),
          eq(collection.handle, handle),
          isNull(collection.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findAll(): Promise<Collection[]> {
    return this.connection
      .select()
      .from(collection)
      .where(and(eq(collection.projectId, this.storeId), isNull(collection.deletedAt)))
      .orderBy(asc(collection.createdAt));
  }

  async getByIds(ids: readonly string[]): Promise<Collection[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(collection)
      .where(
        and(
          eq(collection.projectId, this.storeId),
          inArray(collection.id, [...ids]),
          isNull(collection.deletedAt)
        )
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
      id: randomUUID(),
      projectId: this.storeId,
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
    }
  ): Promise<Collection | null> {
    const updates: Partial<NewCollection> = {
      updatedAt: new Date().toISOString(),
    };
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
      .where(and(eq(collection.projectId, this.storeId), eq(collection.id, id)))
      .returning();
    return rows[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const rows = await this.connection
      .update(collection)
      .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(collection.projectId, this.storeId),
          eq(collection.id, id),
          isNull(collection.deletedAt)
        )
      )
      .returning({ id: collection.id });
    return rows.length > 0;
  }

  async upsertTranslation(data: {
    collectionId: string;
    name: string;
    descriptionText?: string | null;
    descriptionHtml?: string | null;
    descriptionJson?: string | null;
  }): Promise<CollectionTranslation> {
    const insert: NewCollectionTranslation = {
      collectionId: data.collectionId,
      locale: this.locale,
      projectId: this.storeId,
      name: data.name,
      descriptionText: data.descriptionText ?? null,
      descriptionHtml: data.descriptionHtml ?? null,
      descriptionJson: data.descriptionJson ?? null,
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
        },
      })
      .returning();
    return rows[0];
  }

  async getTranslationsByCollectionIds(
    collectionIds: readonly string[]
  ): Promise<CollectionTranslation[]> {
    if (collectionIds.length === 0) return [];
    return this.connection
      .select()
      .from(collectionTranslation)
      .where(
        and(
          eq(collectionTranslation.projectId, this.storeId),
          eq(collectionTranslation.locale, this.locale),
          inArray(collectionTranslation.collectionId, [...collectionIds])
        )
      );
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
      projectId: this.storeId,
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
          eq(collectionSeo.projectId, this.storeId),
          eq(collectionSeo.locale, this.locale),
          inArray(collectionSeo.collectionId, [...collectionIds])
        )
      );
  }

  async setMedia(collectionId: string, fileIds: string[]): Promise<void> {
    await this.connection
      .delete(collectionMedia)
      .where(
        and(
          eq(collectionMedia.projectId, this.storeId),
          eq(collectionMedia.collectionId, collectionId)
        )
      );

    if (fileIds.length === 0) {
      return;
    }

    await this.connection.insert(collectionMedia).values(
      fileIds.map((fileId, index) => ({
        collectionId,
        fileId,
        projectId: this.storeId,
        sortIndex: index,
      }))
    );
  }

  async getMediaByCollectionIds(collectionIds: readonly string[]): Promise<CollectionMedia[]> {
    if (collectionIds.length === 0) return [];
    return this.connection
      .select()
      .from(collectionMedia)
      .where(
        and(
          eq(collectionMedia.projectId, this.storeId),
          inArray(collectionMedia.collectionId, [...collectionIds])
        )
      )
      .orderBy(asc(collectionMedia.sortIndex));
  }
}
