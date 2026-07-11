import { and, count, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
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
  type ProductPostingField,
  type VariantPostingField,
  type PostingKeyInput,
  type PostingMembershipReplaceResult,
  type ExactPostingLookupResult,
  type ListingVariantTermDeltaInput,
  type ListingVariantTermDeltaResult,
} from "./listingRepositoryTypes.js";
import {
  buildAvailabilityVariantTerm,
  buildIndexableVariantTerm,
  buildListingVariantTermPostingKey,
  decodeListingVariantTerm,
  encodeListingVariantTerm,
  getListingVariantTermDefinition,
  LISTING_VARIANT_TERM_REGISTRY_VERSION,
  shouldRetainEmptyListingVariantTerm,
} from "../../listing/variantTerms/index.js";

interface RemoveDocIdsResult extends Record<string, unknown> {
  touchedRows: number;
  deletedEmptyRows: number;
}

export interface ListingVariantTermAuditIssue {
  code:
    | "CARDINALITY_MISMATCH"
    | "TERM_OUTSIDE_UNIVERSE"
    | "AVAILABILITY_OVERLAP"
    | "AVAILABILITY_PARTITION_MISMATCH"
    | "VARIANT_MAPPING_MISSING"
    | "PRICE_OUTSIDE_UNIVERSE"
    | "PRODUCT_AVAILABILITY_AGGREGATE_MISMATCH"
    | "REGISTRY_DIVERGENCE";
  storeId: string;
  encodedKey?: string;
  descriptor?: { fieldKey: string; valueKey: string };
  expected?: number | boolean | string;
  actual?: number | boolean | string;
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

    const rows: ListingPostingBitmap[] = [];
    for (const keyChunk of chunkArray(keys)) {
      const keyFilters = keyChunk.map((key) =>
        and(
          eq(listingPostingBitmap.entityType, key.entityType),
          eq(listingPostingBitmap.field, key.field),
          eq(listingPostingBitmap.valueKey, key.valueKey)
        )
      );
      rows.push(
        ...(await this.connection
          .select()
          .from(listingPostingBitmap)
          .where(
            and(
              eq(listingPostingBitmap.storeId, this.storeId),
              keyFilters.length === 1 ? keyFilters[0] : or(...keyFilters)
            )
          ))
      );
    }

    const requestedOrder = new Map(
      keys.map((key, index) => [this.serializedKey(key), index])
    );
    return rows.sort(
      (left, right) =>
        (requestedOrder.get(this.serializedKey(left as PostingKeyInput)) ?? 0) -
        (requestedOrder.get(this.serializedKey(right as PostingKeyInput)) ?? 0)
    );
  }

  @ReadOnly()
  async getExactByKeys(
    keys: readonly PostingKeyInput[]
  ): Promise<ExactPostingLookupResult[]> {
    const rows = await this.getByKeys(keys);
    const byKey = new Map(
      rows.map((row) => [this.serializedKey(row as PostingKeyInput), row])
    );
    return keys.map((key) => {
      const row = byKey.get(this.serializedKey(key));
      return {
        key,
        row: row
          ? {
              bitmap: row.bitmap,
              cardinality: row.cardinality,
              metadata: row.metadata,
            }
          : null,
      };
    });
  }

  async ensureDeclaredVariantTermRows(): Promise<void> {
    const declaredTerms = [
      buildIndexableVariantTerm(),
      buildAvailabilityVariantTerm(true),
      buildAvailabilityVariantTerm(false),
    ];
    for (const term of declaredTerms.sort((left, right) =>
      encodeListingVariantTerm(left).localeCompare(encodeListingVariantTerm(right))
    )) {
      const key = buildListingVariantTermPostingKey(term);
      await this.connection.execute(sql`
        INSERT INTO listing.listing_posting_bitmap (
          store_id, entity_type, field, value_key, bitmap, cardinality, metadata, updated_at
        )
        SELECT
          ${this.storeId}::uuid,
          'variant',
          'term',
          ${key.valueKey},
          rb_build_agg(seed.doc_id) - rb_build_agg(seed.doc_id),
          0,
          ${JSON.stringify({
            registryVersion: LISTING_VARIANT_TERM_REGISTRY_VERSION,
            registryField: term.fieldKey,
            registryValue: term.valueKey,
          })}::jsonb,
          now()
        FROM (VALUES (0::int)) AS seed(doc_id)
        ON CONFLICT (store_id, entity_type, field, value_key) DO NOTHING
      `);
    }
  }

  @ReadOnly()
  async auditVariantTermIndex(input?: {
    limit?: number;
  }): Promise<ListingVariantTermAuditIssue[]> {
    const limit = Math.min(Math.max(input?.limit ?? 500, 1), 5_000);
    const universeKey = encodeListingVariantTerm(buildIndexableVariantTerm());
    const availableKey = encodeListingVariantTerm(
      buildAvailabilityVariantTerm(true)
    );
    const unavailableKey = encodeListingVariantTerm(
      buildAvailabilityVariantTerm(false)
    );
    const rows = await this.connection.execute<
      Record<string, unknown> & {
        code: ListingVariantTermAuditIssue["code"];
        encodedKey: string | null;
        expected: string | number | boolean | null;
        actual: string | number | boolean | null;
      }
    >(sql`
      WITH empty_bitmap AS (
        SELECT rb_build_agg(doc_id) - rb_build_agg(doc_id) AS bitmap
        FROM (VALUES (0::int)) AS seed(doc_id)
      ),
      universe AS (
        SELECT COALESCE((
          SELECT p.bitmap FROM listing.listing_posting_bitmap p
          WHERE p.store_id = ${this.storeId}::uuid
            AND p.entity_type = 'variant'
            AND p.field = 'term'
            AND p.value_key = ${universeKey}
        ), (SELECT bitmap FROM empty_bitmap)) AS bitmap
      ),
      available AS (
        SELECT COALESCE((
          SELECT p.bitmap FROM listing.listing_posting_bitmap p
          WHERE p.store_id = ${this.storeId}::uuid
            AND p.entity_type = 'variant'
            AND p.field = 'term'
            AND p.value_key = ${availableKey}
        ), (SELECT bitmap FROM empty_bitmap)) AS bitmap
      ),
      unavailable AS (
        SELECT COALESCE((
          SELECT p.bitmap FROM listing.listing_posting_bitmap p
          WHERE p.store_id = ${this.storeId}::uuid
            AND p.entity_type = 'variant'
            AND p.field = 'term'
            AND p.value_key = ${unavailableKey}
        ), (SELECT bitmap FROM empty_bitmap)) AS bitmap
      ),
      issues AS (
        SELECT
          'CARDINALITY_MISMATCH'::text AS code,
          p.value_key AS encoded_key,
          p.cardinality::text AS expected,
          rb_cardinality(p.bitmap)::text AS actual
        FROM listing.listing_posting_bitmap p
        WHERE p.store_id = ${this.storeId}::uuid
          AND p.entity_type = 'variant'
          AND p.field = 'term'
          AND p.cardinality <> rb_cardinality(p.bitmap)

        UNION ALL

        SELECT
          'TERM_OUTSIDE_UNIVERSE',
          p.value_key,
          '0',
          rb_cardinality(p.bitmap - u.bitmap)::text
        FROM listing.listing_posting_bitmap p
        CROSS JOIN universe u
        WHERE p.store_id = ${this.storeId}::uuid
          AND p.entity_type = 'variant'
          AND p.field = 'term'
          AND rb_cardinality(p.bitmap - u.bitmap) > 0

        UNION ALL

        SELECT
          'AVAILABILITY_OVERLAP', ${availableKey}, '0',
          rb_cardinality(a.bitmap & n.bitmap)::text
        FROM available a CROSS JOIN unavailable n
        WHERE rb_cardinality(a.bitmap & n.bitmap) > 0

        UNION ALL

        SELECT
          'AVAILABILITY_PARTITION_MISMATCH', ${universeKey},
          rb_cardinality(u.bitmap)::text,
          rb_cardinality(a.bitmap | n.bitmap)::text
        FROM universe u CROSS JOIN available a CROSS JOIN unavailable n
        WHERE rb_cardinality((a.bitmap | n.bitmap) - u.bitmap) > 0
           OR rb_cardinality(u.bitmap - (a.bitmap | n.bitmap)) > 0

        UNION ALL

        SELECT
          'VARIANT_MAPPING_MISSING', ${universeKey}, '0', COUNT(*)::text
        FROM universe u
        CROSS JOIN LATERAL rb_iterate(u.bitmap) docs(variant_doc_id)
        LEFT JOIN listing.variant_listing_index vli
          ON vli.store_id = ${this.storeId}::uuid
         AND vli.variant_doc_id = docs.variant_doc_id
        WHERE vli.variant_id IS NULL
        HAVING COUNT(*) > 0

        UNION ALL

        SELECT
          'PRICE_OUTSIDE_UNIVERSE', NULL, '0', COUNT(*)::text
        FROM listing.variant_listing_price_index vp
        CROSS JOIN universe u
        WHERE vp.store_id = ${this.storeId}::uuid
          AND NOT (u.bitmap @> vp.variant_doc_id)
        HAVING COUNT(*) > 0

        UNION ALL

        SELECT
          'PRODUCT_AVAILABILITY_AGGREGATE_MISMATCH', NULL,
          BOOL_OR(a.bitmap @> vli.variant_doc_id)::text,
          pli.in_stock::text
        FROM listing.product_listing_index pli
        JOIN listing.variant_listing_index vli
          ON vli.store_id = pli.store_id
         AND vli.product_id = pli.product_id
        CROSS JOIN available a
        WHERE pli.store_id = ${this.storeId}::uuid
        GROUP BY pli.product_id, pli.in_stock
        HAVING BOOL_OR(a.bitmap @> vli.variant_doc_id) <> pli.in_stock
      )
      SELECT
        code AS "code",
        encoded_key AS "encodedKey",
        expected,
        actual
      FROM issues
      LIMIT ${limit}
    `);

    const issues: ListingVariantTermAuditIssue[] = rows.map((row) => {
      let descriptor: { fieldKey: string; valueKey: string } | undefined;
      if (row.encodedKey) {
        try {
          descriptor = decodeListingVariantTerm(row.encodedKey);
        } catch {
          descriptor = undefined;
        }
      }
      return {
        code: row.code,
        storeId: this.storeId,
        ...(row.encodedKey ? { encodedKey: row.encodedKey } : {}),
        ...(descriptor ? { descriptor } : {}),
        ...(row.expected !== null ? { expected: row.expected } : {}),
        ...(row.actual !== null ? { actual: row.actual } : {}),
      };
    });
    const termRows = await this.getByField({
      entityType: "variant",
      field: "term",
    });
    for (const row of termRows.slice(0, limit)) {
      try {
        const descriptor = decodeListingVariantTerm(row.valueKey);
        if (!getListingVariantTermDefinition(descriptor.fieldKey)) {
          throw new Error("definition missing");
        }
        const metadata = row.metadata as Record<string, unknown>;
        if (
          metadata.registryVersion !== LISTING_VARIANT_TERM_REGISTRY_VERSION ||
          metadata.registryField !== descriptor.fieldKey ||
          metadata.registryValue !== descriptor.valueKey
        ) {
          throw new Error("registry metadata mismatch");
        }
      } catch {
        issues.push({
          code: "REGISTRY_DIVERGENCE",
          storeId: this.storeId,
          encodedKey: row.valueKey,
          actual: "unknown or invalid physical term",
        });
      }
    }
    return issues.slice(0, limit);
  }

  @Transactional()
  async applyVariantTermDeltas(
    inputs: readonly ListingVariantTermDeltaInput[]
  ): Promise<ListingVariantTermDeltaResult> {
    const merged = new Map<
      string,
      { term: ListingVariantTermDeltaInput["term"]; removed: Set<number>; added: Set<number> }
    >();
    for (const input of inputs) {
      const encoded = encodeListingVariantTerm(input.term);
      const current = merged.get(encoded) ?? {
        term: input.term,
        removed: new Set<number>(),
        added: new Set<number>(),
      };
      input.removedVariantDocIds.forEach((id) => {
        assertPositiveDocId(id, "removedVariantDocId");
        current.removed.add(id);
      });
      input.addedVariantDocIds.forEach((id) => {
        assertPositiveDocId(id, "addedVariantDocId");
        current.added.add(id);
      });
      merged.set(encoded, current);
    }

    let touchedRows = 0;
    let createdRows = 0;
    let emptiedRows = 0;
    for (const [encoded, delta] of [...merged.entries()].sort(([left], [right]) =>
      left.localeCompare(right)
    )) {
      // A doc present in next state wins when merged product deltas overlap.
      for (const id of delta.added) delta.removed.delete(id);
      const removed = [...delta.removed].sort((left, right) => left - right);
      const added = [...delta.added].sort((left, right) => left - right);
      if (removed.length === 0 && added.length === 0) continue;

      const result = await this.applySingleVariantTermDelta({
        encoded,
        term: delta.term,
        removed,
        added,
      });
      touchedRows += result.touchedRows;
      createdRows += result.createdRows;
      emptiedRows += result.emptiedRows;
    }
    return { touchedRows, createdRows, emptiedRows };
  }

  @Transactional()
  async replaceVariantTermMemberships(
    replacements: readonly {
      variantDocId: number;
      nextValueKeys: readonly string[];
    }[]
  ): Promise<ListingVariantTermDeltaResult> {
    if (replacements.length === 0) {
      return { touchedRows: 0, createdRows: 0, emptiedRows: 0 };
    }
    const normalized = [...replacements]
      .map((replacement) => ({
        variantDocId: replacement.variantDocId,
        nextValueKeys: [...new Set(replacement.nextValueKeys)].sort(),
      }))
      .sort((left, right) => left.variantDocId - right.variantDocId);
    assertUniqueBy(
      normalized,
      (replacement) => String(replacement.variantDocId),
      "variant term replacement"
    );
    normalized.forEach((replacement) => {
      assertPositiveDocId(replacement.variantDocId, "variantDocId");
      replacement.nextValueKeys.forEach((valueKey) =>
        assertPostingKey({ entityType: "variant", field: "term", valueKey })
      );
    });

    const current = await this.getVariantTermMembershipsByDocIds(
      normalized.map((replacement) => replacement.variantDocId)
    );
    const deltas: ListingVariantTermDeltaInput[] = [];
    for (const replacement of normalized) {
      const previousKeys = current.get(replacement.variantDocId) ?? [];
      const previous = new Set(previousKeys);
      const next = new Set(replacement.nextValueKeys);
      for (const valueKey of previousKeys) {
        if (!next.has(valueKey)) {
          deltas.push({
            term: decodeListingVariantTerm(valueKey),
            removedVariantDocIds: [replacement.variantDocId],
            addedVariantDocIds: [],
          });
        }
      }
      for (const valueKey of replacement.nextValueKeys) {
        if (!previous.has(valueKey)) {
          deltas.push({
            term: decodeListingVariantTerm(valueKey),
            removedVariantDocIds: [],
            addedVariantDocIds: [replacement.variantDocId],
          });
        }
      }
    }
    return this.applyVariantTermDeltas(deltas);
  }

  @ReadOnly()
  async getByField(input: {
    entityType: PostingEntityType;
    field: PostingField;
    valueKeys?: readonly string[];
  }): Promise<ListingPostingBitmap[]> {
    assertPostingEntityType(input.entityType);
    assertWritablePostingField(input.field);
    if (
      (input.entityType === "product" &&
        input.field !== "category" &&
        input.field !== "vendor" &&
        input.field !== "facet") ||
      (input.entityType === "variant" &&
        input.field !== "term" &&
        input.field !== "variant_product")
    ) {
      throw new Error(
        `Unsupported posting kind: ${input.entityType}+${input.field}`
      );
    }

    if (input.valueKeys && input.valueKeys.length === 0) {
      return [];
    }

    const uniqueValueKeys = input.valueKeys ? uniqueValues(input.valueKeys) : [];
    if (input.entityType === "variant" && input.field === "term") {
      uniqueValueKeys.forEach((valueKey) =>
        assertPostingKey({ entityType: "variant", field: "term", valueKey })
      );
    }
    const where =
      uniqueValueKeys.length > 0
        ? and(
            eq(listingPostingBitmap.storeId, this.storeId),
            eq(listingPostingBitmap.entityType, input.entityType),
            eq(listingPostingBitmap.field, input.field),
            inArray(listingPostingBitmap.valueKey, uniqueValueKeys)
          )
        : and(
            eq(listingPostingBitmap.storeId, this.storeId),
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
      .where(eq(listingPostingBitmap.storeId, this.storeId));

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
        storeId: this.storeId,
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
          listingPostingBitmap.storeId,
          listingPostingBitmap.entityType,
          listingPostingBitmap.field,
          listingPostingBitmap.valueKey,
        ],
        setWhere: eq(listingPostingBitmap.storeId, this.storeId),
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
            eq(listingPostingBitmap.storeId, this.storeId),
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
      .where(eq(listingPostingBitmap.storeId, this.storeId))
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
        store_id,
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
      ON CONFLICT (store_id, entity_type, field, value_key)
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
      eq(listingPostingBitmap.storeId, this.storeId),
      eq(listingPostingBitmap.entityType, input.entityType),
      input.field !== undefined
        ? eq(listingPostingBitmap.field, input.field)
        : undefined,
      prefixFilters,
      sql`${listingPostingBitmap.bitmap} @> ${input.docId}::int`
    );

    const rows = await this.connection
      .select({
        entityType: listingPostingBitmap.entityType,
        field: listingPostingBitmap.field,
        valueKey: listingPostingBitmap.valueKey,
      })
      .from(listingPostingBitmap)
      .where(where);

    return rows.map((row) => {
      const key = row.entityType === "product"
        ? {
            entityType: "product" as const,
            field: row.field as ProductPostingField,
            valueKey: row.valueKey,
          }
        : {
            entityType: "variant" as const,
            field: row.field as VariantPostingField,
            valueKey: row.valueKey,
          };
      assertPostingKey(key);
      return key;
    });
  }

  @Transactional()
  async replaceProductMemberships(input: {
    productDocId: number;
    field: ProductPostingField;
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
    field: VariantPostingField;
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

  private async replaceMemberships(input: (
    | { entityType: "product"; field: ProductPostingField }
    | { entityType: "variant"; field: VariantPostingField }
  ) & {
    docId: number;
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
      const mutation = this.membershipMutationInput(
        input,
        valueKey,
        input.docId
      );
      const removeResult = await this.removeDocIdsReturning(
        mutation,
        [input.docId]
      );
      deletedEmptyRows += removeResult.deletedEmptyRows;
      touchedRows += removeResult.touchedRows;
    }

    for (const valueKey of valueKeysToAdd) {
      await this.addDocIds(
        this.membershipMutationInput(input, valueKey, input.docId)
      );
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
        WHERE target.store_id = ${this.storeId}::uuid
          AND target.entity_type = ${input.entityType}
          AND target.field = ${input.field}
          AND target.value_key = ${input.valueKey}
          AND delta.bitmap IS NOT NULL
        RETURNING
          target.store_id,
          target.entity_type,
          target.field,
          target.value_key,
          target.cardinality
      ),
      deleted AS (
        DELETE FROM listing.listing_posting_bitmap AS target
        USING updated
        WHERE target.store_id = updated.store_id
          AND target.entity_type = updated.entity_type
          AND target.field = updated.field
          AND target.value_key = updated.value_key
          AND updated.cardinality = 0
          AND ${this.shouldDeleteEmptyPosting(input)}
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
    return uniqueDocIds.sort((left, right) => left - right);
  }

  private async applySingleVariantTermDelta(input: {
    encoded: string;
    term: ListingVariantTermDeltaInput["term"];
    removed: readonly number[];
    added: readonly number[];
  }): Promise<ListingVariantTermDeltaResult> {
    const removedValues = this.optionalDocIdValuesSql(input.removed);
    const addedValues = this.optionalDocIdValuesSql(input.added);
    const retainEmpty = shouldRetainEmptyListingVariantTerm(input.term);
    const rows = await this.connection.execute<
      Record<string, unknown> & {
        touchedRows: number;
        createdRows: number;
        emptiedRows: number;
      }
    >(sql`
      WITH removed_input(doc_id) AS (${removedValues}),
      added_input(doc_id) AS (${addedValues}),
      removed_delta AS (
        SELECT rb_build_agg(doc_id) AS bitmap FROM removed_input WHERE doc_id IS NOT NULL
      ),
      added_delta AS (
        SELECT rb_build_agg(doc_id) AS bitmap FROM added_input WHERE doc_id IS NOT NULL
      ),
      empty_bitmap AS (
        SELECT rb_build_agg(doc_id) - rb_build_agg(doc_id) AS bitmap
        FROM (VALUES (0::int)) AS seed(doc_id)
      ),
      changed AS (
        INSERT INTO listing.listing_posting_bitmap (
          store_id, entity_type, field, value_key, bitmap, cardinality, metadata, updated_at
        )
        SELECT
          ${this.storeId}::uuid,
          'variant',
          'term',
          ${input.encoded},
          COALESCE((SELECT bitmap FROM added_delta), (SELECT bitmap FROM empty_bitmap)),
          rb_cardinality(COALESCE((SELECT bitmap FROM added_delta), (SELECT bitmap FROM empty_bitmap))),
          ${JSON.stringify({
            registryVersion: LISTING_VARIANT_TERM_REGISTRY_VERSION,
            registryField: input.term.fieldKey,
            registryValue: input.term.valueKey,
          })}::jsonb,
          now()
        WHERE ${input.added.length > 0 || retainEmpty}
        ON CONFLICT (store_id, entity_type, field, value_key)
        DO UPDATE SET
          bitmap =
            (listing.listing_posting_bitmap.bitmap - COALESCE(
              (SELECT bitmap FROM removed_delta),
              (SELECT bitmap FROM empty_bitmap)
            ))
            | COALESCE(
              (SELECT bitmap FROM added_delta),
              (SELECT bitmap FROM empty_bitmap)
            ),
          cardinality = rb_cardinality(
            (listing.listing_posting_bitmap.bitmap - COALESCE(
              (SELECT bitmap FROM removed_delta),
              (SELECT bitmap FROM empty_bitmap)
            ))
            | COALESCE(
              (SELECT bitmap FROM added_delta),
              (SELECT bitmap FROM empty_bitmap)
            )
          ),
          metadata = excluded.metadata,
          updated_at = now()
        RETURNING (xmax = 0) AS inserted, cardinality
      )
      SELECT
        (SELECT count(*) FROM changed)::int AS "touchedRows",
        (SELECT count(*) FROM changed WHERE inserted)::int AS "createdRows",
        (SELECT count(*) FROM changed WHERE cardinality = 0)::int AS "emptiedRows"
    `);
    const result = rows[0] ?? {
      touchedRows: 0,
      createdRows: 0,
      emptiedRows: 0,
    };
    if (!retainEmpty && result.emptiedRows > 0) {
      await this.deleteByKey({
        entityType: "variant",
        field: "term",
        valueKey: input.encoded,
      });
    }
    return result;
  }

  private async getVariantTermMembershipsByDocIds(
    variantDocIds: readonly number[]
  ): Promise<Map<number, string[]>> {
    const result = new Map<number, string[]>();
    const rows = await this.connection.execute<
      Record<string, unknown> & { variantDocId: number; valueKey: string }
    >(sql`
      WITH requested(variant_doc_id) AS (
        VALUES ${this.docIdValuesSql(variantDocIds)}
      )
      SELECT
        requested.variant_doc_id::int AS "variantDocId",
        p.value_key AS "valueKey"
      FROM requested
      JOIN listing.listing_posting_bitmap p
        ON p.store_id = ${this.storeId}::uuid
       AND p.entity_type = 'variant'
       AND p.field = 'term'
       AND p.bitmap @> requested.variant_doc_id
      ORDER BY requested.variant_doc_id ASC, p.value_key ASC
    `);
    for (const row of rows) {
      const values = result.get(row.variantDocId) ?? [];
      values.push(row.valueKey);
      result.set(row.variantDocId, values);
    }
    return result;
  }

  private membershipMutationInput(
    input: { entityType: PostingEntityType; field: PostingField },
    valueKey: string,
    docId: number
  ): PostingDocIdsMutationInput {
    if (input.entityType === "product") {
      return {
        entityType: "product",
        field: input.field as ProductPostingField,
        valueKey,
        docIds: [docId],
      };
    }
    return {
      entityType: "variant",
      field: input.field as VariantPostingField,
      valueKey,
      docIds: [docId],
    };
  }

  private optionalDocIdValuesSql(docIds: readonly number[]): SQL {
    if (docIds.length === 0) {
      return sql`SELECT NULL::int WHERE false`;
    }
    return sql`VALUES ${this.docIdValuesSql(docIds)}`;
  }

  private shouldDeleteEmptyPosting(input: PostingKeyInput): boolean {
    if (input.entityType !== "variant" || input.field !== "term") {
      return true;
    }
    const term = decodeListingVariantTerm(input.valueKey);
    const definition = getListingVariantTermDefinition(term.fieldKey);
    return !(definition?.retainEmpty ?? false);
  }

  private docIdValuesSql(docIds: readonly number[]) {
    return sql.join(
      docIds.map((docId) => sql`(${docId}::int)`),
      sql`, `
    );
  }

  private keyWhere(key: PostingKeyInput) {
    return and(
      eq(listingPostingBitmap.storeId, this.storeId),
      eq(listingPostingBitmap.entityType, key.entityType),
      eq(listingPostingBitmap.field, key.field),
      eq(listingPostingBitmap.valueKey, key.valueKey)
    );
  }

  private serializedKey(key: {
    entityType: string;
    field: string;
    valueKey: string;
  }): string {
    return `${key.entityType}\u0000${key.field}\u0000${key.valueKey}`;
  }
}
