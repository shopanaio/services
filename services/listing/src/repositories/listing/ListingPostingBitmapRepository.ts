import { and, count, eq, inArray, like, or, sql } from "drizzle-orm";
import { Transactional, ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  listingPostingBitmap,
  type ListingPostingBitmap,
} from "../models/index.js";
import {
  assertNonNegativeInteger,
  assertPositiveDocId,
  assertPostingEntityType,
  assertPostingKey,
  assertUniqueBy,
  assertValueKeysMatchPrefixes,
  assertWritablePostingField,
  chunkArray,
  matchesAnyPrefix,
  nowIso,
  uniqueValues,
  type PostingBitmapReplaceInput,
  type PostingBitmapUpsertInput,
  type PostingDocIdsMutationInput,
  type PostingEntityType,
  type PostingField,
  type PostingKeyInput,
  type PostingMembershipReplaceResult,
} from "./listingRepositoryTypes.js";

interface RemoveDocIdsResult extends Record<string, unknown> {
  touchedRows: number;
  deletedEmptyRows: number;
}

export class ListingPostingBitmapRepository extends BaseRepository {
  @ReadOnly()
  async exists(key: PostingKeyInput): Promise<boolean> {
    assertPostingKey(key);
    const rows = await this.connection
      .select({ valueKey: listingPostingBitmap.valueKey })
      .from(listingPostingBitmap)
      .where(this.keyWhere(key))
      .limit(1);

    return rows.length > 0;
  }

  @ReadOnly()
  async findByKey(key: PostingKeyInput): Promise<ListingPostingBitmap | null> {
    assertPostingKey(key);
    const rows = await this.connection
      .select()
      .from(listingPostingBitmap)
      .where(this.keyWhere(key))
      .limit(1);

    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByKeys(keys: readonly PostingKeyInput[]): Promise<ListingPostingBitmap[]> {
    if (keys.length === 0) {
      return [];
    }

    for (const key of keys) {
      assertPostingKey(key);
    }

    const keyFilters = keys.map((key) =>
      and(
        eq(listingPostingBitmap.entityType, key.entityType),
        eq(listingPostingBitmap.field, key.field),
        eq(listingPostingBitmap.valueKey, key.valueKey)
      )
    );

    return this.connection
      .select()
      .from(listingPostingBitmap)
      .where(
        and(
          eq(listingPostingBitmap.projectId, this.storeId),
          keyFilters.length === 1 ? keyFilters[0] : or(...keyFilters)
        )
      );
  }

  @ReadOnly()
  async getByField(input: {
    entityType: PostingEntityType;
    field: PostingField;
    valueKeys?: readonly string[];
  }): Promise<ListingPostingBitmap[]> {
    assertPostingEntityType(input.entityType);
    assertWritablePostingField(input.field);

    if (input.valueKeys && input.valueKeys.length === 0) {
      return [];
    }

    const uniqueValueKeys = input.valueKeys ? uniqueValues(input.valueKeys) : [];
    const where =
      uniqueValueKeys.length > 0
        ? and(
            eq(listingPostingBitmap.projectId, this.storeId),
            eq(listingPostingBitmap.entityType, input.entityType),
            eq(listingPostingBitmap.field, input.field),
            inArray(listingPostingBitmap.valueKey, uniqueValueKeys)
          )
        : and(
            eq(listingPostingBitmap.projectId, this.storeId),
            eq(listingPostingBitmap.entityType, input.entityType),
            eq(listingPostingBitmap.field, input.field)
          );

    return this.connection.select().from(listingPostingBitmap).where(where);
  }

  @ReadOnly()
  async count(): Promise<number> {
    const rows = await this.connection
      .select({ value: count() })
      .from(listingPostingBitmap)
      .where(eq(listingPostingBitmap.projectId, this.storeId));

    return rows[0]?.value ?? 0;
  }

  async upsertPostingBitmap(
    input: PostingBitmapUpsertInput
  ): Promise<ListingPostingBitmap> {
    assertPostingKey(input);
    assertNonNegativeInteger(input.cardinality, "cardinality");

    const bitmapSql = sql`${input.bitmap}::roaringbitmap`;
    const rows = await this.connection
      .insert(listingPostingBitmap)
      .values({
        projectId: this.storeId,
        entityType: input.entityType,
        field: input.field,
        valueKey: input.valueKey,
        bitmap: bitmapSql,
        cardinality: sql`rb_cardinality(${bitmapSql})`,
        metadata: input.metadata ?? {},
        updatedAt: nowIso(),
      })
      .onConflictDoUpdate({
        target: [
          listingPostingBitmap.projectId,
          listingPostingBitmap.entityType,
          listingPostingBitmap.field,
          listingPostingBitmap.valueKey,
        ],
        setWhere: eq(listingPostingBitmap.projectId, this.storeId),
        set: {
          bitmap: bitmapSql,
          cardinality: sql`rb_cardinality(${bitmapSql})`,
          metadata: input.metadata ?? {},
          updatedAt: nowIso(),
        },
      })
      .returning();

    return rows[0];
  }

  async replacePostingBitmap(
    input: PostingBitmapReplaceInput
  ): Promise<ListingPostingBitmap> {
    return this.upsertPostingBitmap(input);
  }

  async deleteByKey(key: PostingKeyInput): Promise<boolean> {
    assertPostingKey(key);
    const rows = await this.connection
      .delete(listingPostingBitmap)
      .where(this.keyWhere(key))
      .returning({ valueKey: listingPostingBitmap.valueKey });

    return rows.length > 0;
  }

  async deleteByKeys(keys: readonly PostingKeyInput[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }

    for (const key of keys) {
      assertPostingKey(key);
    }

    let deleted = 0;
    for (const chunk of chunkArray(keys)) {
      const keyFilters = chunk.map((key) =>
        and(
          eq(listingPostingBitmap.entityType, key.entityType),
          eq(listingPostingBitmap.field, key.field),
          eq(listingPostingBitmap.valueKey, key.valueKey)
        )
      );

      const rows = await this.connection
        .delete(listingPostingBitmap)
        .where(
          and(
            eq(listingPostingBitmap.projectId, this.storeId),
            keyFilters.length === 1 ? keyFilters[0] : or(...keyFilters)
          )
        )
        .returning({ valueKey: listingPostingBitmap.valueKey });

      deleted += rows.length;
    }

    return deleted;
  }

  async deleteAllForCurrentProject(): Promise<number> {
    const rows = await this.connection
      .delete(listingPostingBitmap)
      .where(eq(listingPostingBitmap.projectId, this.storeId))
      .returning({ valueKey: listingPostingBitmap.valueKey });

    return rows.length;
  }

  async addDocIds(input: PostingDocIdsMutationInput): Promise<void> {
    assertPostingKey(input);
    const docIds = this.normalizeDocIds(input.docIds);
    if (docIds.length === 0) {
      return;
    }

    const valuesSql = this.docIdValuesSql(docIds);
    await this.connection.execute(sql`
      WITH input_doc_ids(doc_id) AS (
        VALUES ${valuesSql}
      ),
      delta AS (
        SELECT rb_build_agg(doc_id) AS bitmap
        FROM input_doc_ids
      )
      INSERT INTO listing.listing_posting_bitmap (
        project_id,
        entity_type,
        field,
        value_key,
        bitmap,
        cardinality,
        metadata,
        updated_at
      )
      SELECT
        ${this.storeId}::uuid,
        ${input.entityType},
        ${input.field},
        ${input.valueKey},
        delta.bitmap,
        rb_cardinality(delta.bitmap),
        '{}'::jsonb,
        now()
      FROM delta
      WHERE delta.bitmap IS NOT NULL
      ON CONFLICT (project_id, entity_type, field, value_key)
      DO UPDATE SET
        bitmap = listing.listing_posting_bitmap.bitmap | excluded.bitmap,
        cardinality = rb_cardinality(listing.listing_posting_bitmap.bitmap | excluded.bitmap),
        updated_at = now()
    `);
  }

  async removeDocIds(input: PostingDocIdsMutationInput): Promise<void> {
    assertPostingKey(input);
    const docIds = this.normalizeDocIds(input.docIds);
    if (docIds.length === 0) {
      return;
    }

    await this.removeDocIdsReturning(input, docIds);
  }

  @ReadOnly()
  async getMembershipKeys(input: {
    entityType: PostingEntityType;
    docId: number;
    field?: PostingField;
    valueKeyPrefixes?: readonly string[];
  }): Promise<PostingKeyInput[]> {
    assertPostingEntityType(input.entityType);
    assertPositiveDocId(input.docId, "docId");
    if (input.field !== undefined) {
      assertWritablePostingField(input.field);
    }

    const prefixFilters =
      input.valueKeyPrefixes && input.valueKeyPrefixes.length > 0
        ? or(
            ...input.valueKeyPrefixes.map((prefix) =>
              like(listingPostingBitmap.valueKey, `${prefix}%`)
            )
          )
        : undefined;

    const where = and(
      eq(listingPostingBitmap.projectId, this.storeId),
      eq(listingPostingBitmap.entityType, input.entityType),
      input.field !== undefined
        ? eq(listingPostingBitmap.field, input.field)
        : undefined,
      prefixFilters,
      sql`${listingPostingBitmap.bitmap} @> ${input.docId}`
    );

    const rows = await this.connection
      .select({
        entityType: listingPostingBitmap.entityType,
        field: listingPostingBitmap.field,
        valueKey: listingPostingBitmap.valueKey,
      })
      .from(listingPostingBitmap)
      .where(where);

    return rows.map((row) => ({
      entityType: row.entityType as PostingEntityType,
      field: row.field,
      valueKey: row.valueKey,
    }));
  }

  @Transactional()
  async replaceProductMemberships(input: {
    productDocId: number;
    field: PostingField;
    nextValueKeys: readonly string[];
    valueKeyPrefixes?: readonly string[];
  }): Promise<PostingMembershipReplaceResult> {
    return this.replaceMemberships({
      entityType: "product",
      docId: input.productDocId,
      field: input.field,
      nextValueKeys: input.nextValueKeys,
      valueKeyPrefixes: input.valueKeyPrefixes,
    });
  }

  @Transactional()
  async replaceVariantMemberships(input: {
    variantDocId: number;
    field: PostingField;
    nextValueKeys: readonly string[];
    valueKeyPrefixes?: readonly string[];
  }): Promise<PostingMembershipReplaceResult> {
    return this.replaceMemberships({
      entityType: "variant",
      docId: input.variantDocId,
      field: input.field,
      nextValueKeys: input.nextValueKeys,
      valueKeyPrefixes: input.valueKeyPrefixes,
    });
  }

  @Transactional()
  async deleteProductMemberships(
    productDocId: number
  ): Promise<PostingMembershipReplaceResult> {
    return this.deleteMemberships("product", productDocId);
  }

  @Transactional()
  async deleteVariantMemberships(
    variantDocId: number
  ): Promise<PostingMembershipReplaceResult> {
    return this.deleteMemberships("variant", variantDocId);
  }

  private async replaceMemberships(input: {
    entityType: PostingEntityType;
    docId: number;
    field: PostingField;
    nextValueKeys: readonly string[];
    valueKeyPrefixes?: readonly string[];
  }): Promise<PostingMembershipReplaceResult> {
    assertPositiveDocId(input.docId, "docId");
    assertWritablePostingField(input.field);
    assertValueKeysMatchPrefixes(input.nextValueKeys, input.valueKeyPrefixes);
    assertUniqueBy(input.nextValueKeys, (valueKey) => valueKey, "posting valueKey");

    const currentKeys = await this.getMembershipKeys({
      entityType: input.entityType,
      docId: input.docId,
      field: input.field,
      valueKeyPrefixes: input.valueKeyPrefixes,
    });

    const currentValueKeys = currentKeys
      .map((key) => key.valueKey)
      .filter((valueKey) => matchesAnyPrefix(valueKey, input.valueKeyPrefixes));
    const currentSet = new Set(currentValueKeys);
    const nextSet = new Set(input.nextValueKeys);

    const valueKeysToRemove = currentValueKeys.filter(
      (valueKey) => !nextSet.has(valueKey)
    );
    const valueKeysToAdd = input.nextValueKeys.filter(
      (valueKey) => !currentSet.has(valueKey)
    );

    let deletedEmptyRows = 0;
    let touchedRows = 0;

    for (const valueKey of valueKeysToRemove) {
      const removeResult = await this.removeDocIdsReturning(
        {
          entityType: input.entityType,
          field: input.field,
          valueKey,
          docIds: [input.docId],
        },
        [input.docId]
      );
      deletedEmptyRows += removeResult.deletedEmptyRows;
      touchedRows += removeResult.touchedRows;
    }

    for (const valueKey of valueKeysToAdd) {
      await this.addDocIds({
        entityType: input.entityType,
        field: input.field,
        valueKey,
        docIds: [input.docId],
      });
      touchedRows += 1;
    }

    return {
      addedMemberships: valueKeysToAdd.length,
      removedMemberships: valueKeysToRemove.length,
      touchedRows,
      deletedEmptyRows,
    };
  }

  private async deleteMemberships(
    entityType: PostingEntityType,
    docId: number
  ): Promise<PostingMembershipReplaceResult> {
    assertPositiveDocId(docId, "docId");
    const currentKeys = await this.getMembershipKeys({ entityType, docId });

    let deletedEmptyRows = 0;
    let touchedRows = 0;
    for (const key of currentKeys) {
      const removeResult = await this.removeDocIdsReturning(
        { ...key, docIds: [docId] },
        [docId]
      );
      deletedEmptyRows += removeResult.deletedEmptyRows;
      touchedRows += removeResult.touchedRows;
    }

    return {
      addedMemberships: 0,
      removedMemberships: currentKeys.length,
      touchedRows,
      deletedEmptyRows,
    };
  }

  private async removeDocIdsReturning(
    input: PostingDocIdsMutationInput,
    docIds: readonly number[]
  ): Promise<RemoveDocIdsResult> {
    const valuesSql = this.docIdValuesSql(docIds);
    const rows = await this.connection.execute<RemoveDocIdsResult>(sql`
      WITH input_doc_ids(doc_id) AS (
        VALUES ${valuesSql}
      ),
      delta AS (
        SELECT rb_build_agg(doc_id) AS bitmap
        FROM input_doc_ids
      ),
      updated AS (
        UPDATE listing.listing_posting_bitmap AS target
        SET
          bitmap = target.bitmap - delta.bitmap,
          cardinality = rb_cardinality(target.bitmap - delta.bitmap),
          updated_at = now()
        FROM delta
        WHERE target.project_id = ${this.storeId}::uuid
          AND target.entity_type = ${input.entityType}
          AND target.field = ${input.field}
          AND target.value_key = ${input.valueKey}
          AND delta.bitmap IS NOT NULL
        RETURNING
          target.project_id,
          target.entity_type,
          target.field,
          target.value_key,
          target.cardinality
      ),
      deleted AS (
        DELETE FROM listing.listing_posting_bitmap AS target
        USING updated
        WHERE target.project_id = updated.project_id
          AND target.entity_type = updated.entity_type
          AND target.field = updated.field
          AND target.value_key = updated.value_key
          AND updated.cardinality = 0
        RETURNING 1
      )
      SELECT
        (SELECT count(*) FROM updated)::int AS "touchedRows",
        (SELECT count(*) FROM deleted)::int AS "deletedEmptyRows"
    `);

    return rows[0] ?? { touchedRows: 0, deletedEmptyRows: 0 };
  }

  private normalizeDocIds(docIds: readonly number[]): number[] {
    const uniqueDocIds = uniqueValues(docIds);
    for (const docId of uniqueDocIds) {
      assertPositiveDocId(docId, "docId");
    }
    return uniqueDocIds;
  }

  private docIdValuesSql(docIds: readonly number[]) {
    return sql.join(
      docIds.map((docId) => sql`(${docId})`),
      sql`, `
    );
  }

  private keyWhere(key: PostingKeyInput) {
    return and(
      eq(listingPostingBitmap.projectId, this.storeId),
      eq(listingPostingBitmap.entityType, key.entityType),
      eq(listingPostingBitmap.field, key.field),
      eq(listingPostingBitmap.valueKey, key.valueKey)
    );
  }
}
