import { and, asc, eq, getTableColumns, sql } from "drizzle-orm";
import type {
  CatalogCollectionListingSnapshot,
  CatalogCollectionListingTombstone,
} from "@shopana/broker-types";
import {
  decodeCollectionRuleTerm,
  COLLECTION_LISTING_CONTRACT_VERSION,
  hashCanonicalCollectionRulesV1,
  hashCollectionListingPayloadV1,
  normalizeCanonicalCollectionRulesV1,
} from "@shopana/broker-types";
import { BaseRepository } from "../BaseRepository.js";
import {
  collectionState,
  collectionTombstone,
  type CollectionState,
  type CollectionTombstone,
} from "../models/index.js";

export type CollectionProjectionApplyStatus = "applied" | "noop" | "ignored_stale";

export class CollectionProjectionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollectionProjectionConflictError";
  }
}

export interface CollectionConsistencyIssue {
  code:
    | "INVALID_LIVE_STATE"
    | "INVALID_TOMBSTONE"
    | "LIVE_TOMBSTONE_OVERLAP"
    | "ORPHAN_COLLECTION_POSTING"
    | "ORPHAN_MANUAL_SORT"
    | "INVALID_RULE_TERM"
    | "POSTING_CARDINALITY_MISMATCH"
    | "POSTING_DOC_ORPHAN";
  collectionId?: string;
  entityType?: string;
  valueKey?: string;
  message: string;
}

export class CollectionStateRepository extends BaseRepository {
  async auditConsistency(limit = 100, offset = 0): Promise<CollectionConsistencyIssue[]> {
    const boundedLimit = Number.isSafeInteger(limit) ? Math.max(1, Math.min(limit, 1_000)) : 100;
    const boundedOffset = Number.isSafeInteger(offset) && offset > 0 ? offset : 0;
    const issues: CollectionConsistencyIssue[] = [];
    const [states, tombstones] = await Promise.all([
      this.connection
        .select()
        .from(collectionState)
        .where(eq(collectionState.storeId, this.storeId))
        .orderBy(asc(collectionState.collectionId))
        .limit(boundedLimit)
        .offset(boundedOffset),
      this.connection
        .select()
        .from(collectionTombstone)
        .where(eq(collectionTombstone.storeId, this.storeId))
        .orderBy(asc(collectionTombstone.collectionId))
        .limit(boundedLimit)
        .offset(boundedOffset),
    ]);
    for (const state of states) {
      try {
        const rules = normalizeCanonicalCollectionRulesV1(state.rulesJson);
        if (state.collectionType === "manual" && rules.length > 0) {
          throw new Error("Manual collection has rule JSON");
        }
        if (state.collectionType === "rule" && state.defaultSort === "manual") {
          throw new Error("Rule collection uses manual sort");
        }
        if (hashCanonicalCollectionRulesV1(rules) !== state.rulesHash) {
          throw new Error("Rules hash does not match canonical rule JSON");
        }
        const payloadHash = hashCollectionListingPayloadV1({
          snapshotVersion: COLLECTION_LISTING_CONTRACT_VERSION,
          state: "live",
          id: state.collectionId,
          storeId: state.storeId,
          listingRevision: state.listingRevision,
          type: state.collectionType,
          defaultSort: state.defaultSort,
          defaultSortDirection: state.defaultSortDirection,
          publishedAt: state.publishedAt,
          effectiveFrom: state.effectiveFrom,
          effectiveTo: state.effectiveTo,
          rulesHash: state.rulesHash,
          rules,
          listingUpdatedAt: state.sourceUpdatedAt,
        });
        if (payloadHash !== state.payloadHash) {
          throw new Error("Live collection payload hash does not match");
        }
      } catch (error) {
        issues.push({
          code: "INVALID_LIVE_STATE",
          collectionId: state.collectionId,
          message: error instanceof Error ? error.message : "Invalid live state",
        });
      }
    }
    for (const tombstone of tombstones) {
      try {
        const payloadHash = hashCollectionListingPayloadV1({
          snapshotVersion: COLLECTION_LISTING_CONTRACT_VERSION,
          state: "deleted",
          id: tombstone.collectionId,
          storeId: tombstone.storeId,
          listingRevision: tombstone.listingRevision,
          deletedAt: tombstone.deletedAt,
        });
        if (payloadHash !== tombstone.payloadHash) {
          throw new Error("Collection tombstone payload hash does not match");
        }
      } catch (error) {
        issues.push({
          code: "INVALID_TOMBSTONE",
          collectionId: tombstone.collectionId,
          message: error instanceof Error ? error.message : "Invalid tombstone",
        });
      }
    }
    issues.push(...(await this.auditDerivedRows(boundedLimit - issues.length, boundedOffset)));
    return issues.slice(0, boundedLimit);
  }

  async repairOrphanDerivedRows(limit = 100): Promise<{
    collectionPostingsDeleted: number;
    manualSortRowsDeleted: number;
  }> {
    const boundedLimit = Number.isSafeInteger(limit) ? Math.max(1, Math.min(limit, 1_000)) : 100;
    const postingRows = await this.connection.execute<{ valueKey: string }>(sql`
      WITH doomed AS (
        SELECT p.store_id, p.entity_type, p.field, p.value_key
        FROM listing.listing_posting_bitmap p
        WHERE p.store_id = ${this.storeId}::uuid
          AND p.entity_type = 'product'
          AND p.field = 'collection'
          AND NOT EXISTS (
            SELECT 1 FROM listing.collection_state c
            WHERE c.store_id = p.store_id
              AND c.collection_id::text = p.value_key
              AND c.collection_type = 'manual'
          )
        ORDER BY p.value_key
        LIMIT ${boundedLimit}
      )
      DELETE FROM listing.listing_posting_bitmap p
      USING doomed d
      WHERE p.store_id = d.store_id
        AND p.entity_type = d.entity_type
        AND p.field = d.field
        AND p.value_key = d.value_key
      RETURNING p.value_key AS "valueKey"
    `);
    const remaining = Math.max(0, boundedLimit - postingRows.length);
    const sortRows =
      remaining === 0
        ? []
        : await this.connection.execute<{ productDocId: number }>(sql`
          WITH doomed AS (
            SELECT s.store_id, s.product_doc_id, s.sort_kind, s.locale,
              s.currency, s.manual_scope_id
            FROM listing.listing_posting_product_sort s
            WHERE s.store_id = ${this.storeId}::uuid
              AND s.sort_kind = 'manual'
              AND (
                EXISTS (
                  SELECT 1 FROM listing.collection_state known
                  WHERE known.store_id = s.store_id
                    AND known.collection_id = s.manual_scope_id
                )
                OR EXISTS (
                  SELECT 1 FROM listing.collection_tombstone known
                  WHERE known.store_id = s.store_id
                    AND known.collection_id = s.manual_scope_id
                )
              )
              AND NOT EXISTS (
                SELECT 1 FROM listing.listing_posting_bitmap p
                WHERE p.store_id = s.store_id
                  AND p.entity_type = 'product'
                  AND p.field = 'collection'
                  AND p.value_key = s.manual_scope_id::text
                  AND p.bitmap @> s.product_doc_id
              )
            ORDER BY s.manual_scope_id, s.product_doc_id
            LIMIT ${remaining}
          )
          DELETE FROM listing.listing_posting_product_sort s
          USING doomed d
          WHERE s.store_id = d.store_id
            AND s.product_doc_id = d.product_doc_id
            AND s.sort_kind = d.sort_kind
            AND s.locale IS NOT DISTINCT FROM d.locale
            AND s.currency IS NOT DISTINCT FROM d.currency
            AND s.manual_scope_id = d.manual_scope_id
          RETURNING s.product_doc_id AS "productDocId"
        `);
    const result = {
      collectionPostingsDeleted: postingRows.length,
      manualSortRowsDeleted: sortRows.length,
    };
    if (result.collectionPostingsDeleted > 0 || result.manualSortRowsDeleted > 0) {
      this.ctx.kernel
        .getServices()
        .logger.warn(result, "Removed orphan collection-derived listing rows");
    }
    return result;
  }
  async findState(collectionId: string): Promise<CollectionState | null> {
    const rows = await this.connection
      .select()
      .from(collectionState)
      .where(
        and(
          eq(collectionState.storeId, this.storeId),
          eq(collectionState.collectionId, collectionId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findStateWithVisibility(
    collectionId: string,
  ): Promise<(CollectionState & { isVisible: boolean }) | null> {
    const rows = await this.connection
      .select({
        ...getTableColumns(collectionState),
        isVisible: sql<boolean>`
          ${collectionState.publishedAt} IS NOT NULL
          AND ${collectionState.publishedAt} <= now()
          AND (
            ${collectionState.effectiveFrom} IS NULL
            OR ${collectionState.effectiveFrom} <= now()
          )
          AND (
            ${collectionState.effectiveTo} IS NULL
            OR ${collectionState.effectiveTo} > now()
          )
        `,
      })
      .from(collectionState)
      .where(
        and(
          eq(collectionState.storeId, this.storeId),
          eq(collectionState.collectionId, collectionId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findTombstone(collectionId: string): Promise<CollectionTombstone | null> {
    const rows = await this.connection
      .select()
      .from(collectionTombstone)
      .where(
        and(
          eq(collectionTombstone.storeId, this.storeId),
          eq(collectionTombstone.collectionId, collectionId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async applyLive(
    snapshot: CatalogCollectionListingSnapshot,
    eventSequence: number,
  ): Promise<CollectionProjectionApplyStatus> {
    await this.lock(snapshot.id);
    const [current, tombstone] = await Promise.all([
      this.findState(snapshot.id),
      this.findTombstone(snapshot.id),
    ]);
    if (tombstone) {
      if (tombstone.listingRevision > snapshot.listingRevision) {
        return "ignored_stale";
      }
      throw new CollectionProjectionConflictError(
        "A deleted collection cannot be restored by a live snapshot",
      );
    }
    if (current && current.listingRevision > snapshot.listingRevision) {
      return "ignored_stale";
    }
    if (current?.listingRevision === snapshot.listingRevision) {
      if (current.payloadHash !== snapshot.payloadHash) {
        throw new CollectionProjectionConflictError(
          "Collection payload changed without a listing revision change",
        );
      }
      await this.observeLiveEventSequence(snapshot.id, eventSequence);
      return "noop";
    }

    const projectedAt = new Date().toISOString();
    await this.connection
      .insert(collectionState)
      .values({
        storeId: this.storeId,
        collectionId: snapshot.id,
        listingRevision: snapshot.listingRevision,
        collectionType: snapshot.type,
        defaultSort: snapshot.defaultSort,
        defaultSortDirection: snapshot.defaultSortDirection,
        publishedAt: snapshot.publishedAt,
        effectiveFrom: snapshot.effectiveFrom,
        effectiveTo: snapshot.effectiveTo,
        rulesJson: [...snapshot.rules],
        rulesHash: snapshot.rulesHash,
        payloadHash: snapshot.payloadHash,
        eventSequence,
        sourceUpdatedAt: snapshot.listingUpdatedAt,
        projectedAt,
      })
      .onConflictDoUpdate({
        target: [collectionState.storeId, collectionState.collectionId],
        set: {
          listingRevision: snapshot.listingRevision,
          collectionType: snapshot.type,
          defaultSort: snapshot.defaultSort,
          defaultSortDirection: snapshot.defaultSortDirection,
          publishedAt: snapshot.publishedAt,
          effectiveFrom: snapshot.effectiveFrom,
          effectiveTo: snapshot.effectiveTo,
          rulesJson: [...snapshot.rules],
          rulesHash: snapshot.rulesHash,
          payloadHash: snapshot.payloadHash,
          eventSequence,
          sourceUpdatedAt: snapshot.listingUpdatedAt,
          projectedAt,
        },
      });
    return "applied";
  }

  async applyDeleted(
    snapshot: CatalogCollectionListingTombstone,
    eventSequence: number,
  ): Promise<CollectionProjectionApplyStatus> {
    await this.lock(snapshot.id);
    const [current, tombstone] = await Promise.all([
      this.findState(snapshot.id),
      this.findTombstone(snapshot.id),
    ]);
    if (tombstone && tombstone.listingRevision > snapshot.listingRevision) {
      return "ignored_stale";
    }
    if (tombstone?.listingRevision === snapshot.listingRevision) {
      if (tombstone.payloadHash !== snapshot.payloadHash) {
        throw new CollectionProjectionConflictError(
          "Collection tombstone changed without a listing revision change",
        );
      }
      await this.observeTombstoneEventSequence(snapshot.id, eventSequence);
      return "noop";
    }
    if (current && current.listingRevision >= snapshot.listingRevision) {
      if (current.listingRevision > snapshot.listingRevision) {
        return "ignored_stale";
      }
      throw new CollectionProjectionConflictError(
        "Live and deleted collection states share a listing revision",
      );
    }

    await this.connection
      .insert(collectionTombstone)
      .values({
        storeId: this.storeId,
        collectionId: snapshot.id,
        listingRevision: snapshot.listingRevision,
        payloadHash: snapshot.payloadHash,
        eventSequence,
        deletedAt: snapshot.deletedAt,
        projectedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: [collectionTombstone.storeId, collectionTombstone.collectionId],
        set: {
          listingRevision: snapshot.listingRevision,
          payloadHash: snapshot.payloadHash,
          eventSequence,
          deletedAt: snapshot.deletedAt,
          projectedAt: new Date().toISOString(),
        },
      });
    await this.connection
      .delete(collectionState)
      .where(
        and(
          eq(collectionState.storeId, this.storeId),
          eq(collectionState.collectionId, snapshot.id),
        ),
      );
    return "applied";
  }

  private async auditDerivedRows(
    limit: number,
    offset: number,
  ): Promise<CollectionConsistencyIssue[]> {
    if (limit <= 0) return [];
    const rows = await this.connection.execute<{
      code: CollectionConsistencyIssue["code"];
      collectionId: string | null;
      entityType: string | null;
      valueKey: string | null;
      message: string;
    }>(sql`
      WITH product_universe AS (
        SELECT COALESCE(
          rb_build_agg(product_doc_id),
          (SELECT rb_build_agg(x) - rb_build_agg(x) FROM (VALUES (0)) seed(x))
        ) AS bitmap
        FROM listing.product_listing_index
        WHERE store_id = ${this.storeId}::uuid
      ),
      variant_universe AS (
        SELECT COALESCE(
          rb_build_agg(variant_doc_id),
          (SELECT rb_build_agg(x) - rb_build_agg(x) FROM (VALUES (0)) seed(x))
        ) AS bitmap
        FROM listing.variant_listing_index
        WHERE store_id = ${this.storeId}::uuid
      ),
      issues AS (
        SELECT
          'LIVE_TOMBSTONE_OVERLAP'::text AS code,
          c.collection_id::text AS collection_id,
          NULL::text AS entity_type,
          NULL::text AS value_key,
          'Live state and tombstone coexist'::text AS message
        FROM listing.collection_state c
        JOIN listing.collection_tombstone t
          ON t.store_id = c.store_id
         AND t.collection_id = c.collection_id
        WHERE c.store_id = ${this.storeId}::uuid

        UNION ALL

        SELECT
          'ORPHAN_COLLECTION_POSTING',
          p.value_key,
          p.entity_type,
          p.value_key,
          'Collection posting has no live manual collection state'
        FROM listing.listing_posting_bitmap p
        WHERE p.store_id = ${this.storeId}::uuid
          AND p.entity_type = 'product'
          AND p.field = 'collection'
          AND NOT EXISTS (
            SELECT 1 FROM listing.collection_state c
            WHERE c.store_id = p.store_id
              AND c.collection_id::text = p.value_key
              AND c.collection_type = 'manual'
          )

        UNION ALL

        SELECT
          'ORPHAN_MANUAL_SORT',
          s.manual_scope_id::text,
          'product',
          s.manual_scope_id::text,
          'Manual sort row has no live manual collection state'
        FROM listing.listing_posting_product_sort s
        WHERE s.store_id = ${this.storeId}::uuid
          AND s.sort_kind = 'manual'
          AND (
            EXISTS (
              SELECT 1 FROM listing.collection_state known
              WHERE known.store_id = s.store_id
                AND known.collection_id = s.manual_scope_id
            )
            OR EXISTS (
              SELECT 1 FROM listing.collection_tombstone known
              WHERE known.store_id = s.store_id
                AND known.collection_id = s.manual_scope_id
            )
          )
          AND NOT EXISTS (
            SELECT 1 FROM listing.listing_posting_bitmap p
            WHERE p.store_id = s.store_id
              AND p.entity_type = 'product'
              AND p.field = 'collection'
              AND p.value_key = s.manual_scope_id::text
              AND p.bitmap @> s.product_doc_id
          )

        UNION ALL

        SELECT
          'POSTING_CARDINALITY_MISMATCH',
          NULL,
          p.entity_type,
          p.value_key,
          'Stored posting cardinality does not match bitmap cardinality'
        FROM listing.listing_posting_bitmap p
        WHERE p.store_id = ${this.storeId}::uuid
          AND p.field IN ('collection', 'rule_term')
          AND p.cardinality <> rb_cardinality(p.bitmap)

        UNION ALL

        SELECT
          'POSTING_DOC_ORPHAN',
          NULL,
          p.entity_type,
          p.value_key,
          'Collection posting contains a document outside its entity universe'
        FROM listing.listing_posting_bitmap p
        CROSS JOIN product_universe pu
        CROSS JOIN variant_universe vu
        WHERE p.store_id = ${this.storeId}::uuid
          AND p.field IN ('collection', 'rule_term')
          AND rb_cardinality(
            p.bitmap - CASE
              WHEN p.entity_type = 'product' THEN pu.bitmap
              ELSE vu.bitmap
            END
          ) > 0
      )
      SELECT
        code,
        collection_id AS "collectionId",
        entity_type AS "entityType",
        value_key AS "valueKey",
        message
      FROM issues
      ORDER BY code, collection_id NULLS LAST, value_key NULLS LAST
      LIMIT ${limit}
      OFFSET ${offset}
    `);
    const issues = rows.map((row) => ({
      code: row.code,
      collectionId: row.collectionId ?? undefined,
      entityType: row.entityType ?? undefined,
      valueKey: row.valueKey ?? undefined,
      message: row.message,
    }));
    const remaining = limit - issues.length;
    if (remaining <= 0) return issues;
    const ruleTerms = await this.connection.execute<{
      entityType: string;
      valueKey: string;
    }>(sql`
      SELECT
        entity_type AS "entityType",
        value_key AS "valueKey"
      FROM listing.listing_posting_bitmap
      WHERE store_id = ${this.storeId}::uuid
        AND field = 'rule_term'
      ORDER BY entity_type, value_key
      LIMIT ${remaining}
      OFFSET ${offset}
    `);
    for (const row of ruleTerms) {
      try {
        if (row.entityType !== "product" && row.entityType !== "variant") {
          throw new Error("Rule term has invalid entity type");
        }
        decodeCollectionRuleTerm(row.entityType, row.valueKey);
      } catch (error) {
        issues.push({
          code: "INVALID_RULE_TERM",
          collectionId: undefined,
          entityType: row.entityType,
          valueKey: row.valueKey,
          message: error instanceof Error ? error.message : "Rule term is invalid",
        });
      }
    }
    return issues;
  }

  private async lock(collectionId: string): Promise<void> {
    await this.connection.execute(sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${`${this.storeId}:${collectionId}`}, 0)
      )
    `);
  }

  private async observeLiveEventSequence(
    collectionId: string,
    eventSequence: number,
  ): Promise<void> {
    await this.connection
      .update(collectionState)
      .set({
        eventSequence: sql`greatest(${collectionState.eventSequence}, ${eventSequence})`,
      })
      .where(
        and(
          eq(collectionState.storeId, this.storeId),
          eq(collectionState.collectionId, collectionId),
        ),
      );
  }

  private async observeTombstoneEventSequence(
    collectionId: string,
    eventSequence: number,
  ): Promise<void> {
    await this.connection
      .update(collectionTombstone)
      .set({
        eventSequence: sql`greatest(${collectionTombstone.eventSequence}, ${eventSequence})`,
      })
      .where(
        and(
          eq(collectionTombstone.storeId, this.storeId),
          eq(collectionTombstone.collectionId, collectionId),
        ),
      );
  }
}
