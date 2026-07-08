import { randomUUID } from "crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { Transactional } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  listingOptionSignature,
  listingOptionSignatureProductMembership,
  listingOptionSignatureValue,
} from "../models/index.js";
import {
  assertPositiveDocId,
  assertUniqueBy,
  buildOptionSignatureKey,
  chunkArray,
  normalizeOptionValueKeys,
  nowIso,
  type OptionSignatureProductReplacementInput,
} from "./listingRepositoryTypes.js";

type NormalizedProductSignature = {
  signatureKey: string;
  valueKeys: string[];
  variantCount: number;
};

type NormalizedProductReplacement = {
  productDocId: number;
  signatures: NormalizedProductSignature[];
};

type SignatureGroup = {
  signatureKey: string;
  valueKeys: string[];
  productVariantCounts: Map<number, number>;
};

export class ListingOptionSignatureRepository extends BaseRepository {
  @Transactional()
  async replaceForProduct(
    replacement: OptionSignatureProductReplacementInput
  ): Promise<void> {
    await this.replaceForProducts([replacement]);
  }

  @Transactional()
  async replaceForProducts(
    replacements: readonly OptionSignatureProductReplacementInput[]
  ): Promise<void> {
    if (replacements.length === 0) {
      return;
    }

    assertUniqueBy(
      replacements,
      (replacement) => String(replacement.productDocId),
      "option signature product replacement"
    );

    const normalized = replacements.map((replacement) =>
      this.normalizeReplacement(replacement)
    );
    const productDocIds = normalized.map((replacement) => replacement.productDocId);
    const currentSignatureKeys =
      await this.getMembershipSignatureKeys(productDocIds);
    const groups = this.groupNextSignatures(normalized);
    const nextSignatureKeys = [...groups.keys()].sort(compareStrings);
    const touchedSignatureKeys = uniqueSortedStrings([
      ...currentSignatureKeys,
      ...nextSignatureKeys,
    ]);

    await this.lockSignatureKeys(touchedSignatureKeys);

    await this.deleteMembershipsByProductDocIds(productDocIds);

    if (groups.size > 0) {
      await this.ensureSignatureRows([...groups.values()]);
      const optionSignatureIds =
        await this.getOptionSignatureIds(nextSignatureKeys);

      await this.upsertSignatureValueRows(groups, optionSignatureIds);
      await this.upsertMembershipRows(groups, optionSignatureIds);
    }

    await this.refreshSignatureBitmaps(touchedSignatureKeys);
  }

  @Transactional()
  async deleteProductMemberships(productDocId: number): Promise<void> {
    assertPositiveDocId(productDocId, "productDocId");
    const currentSignatureKeys = await this.getMembershipSignatureKeys([
      productDocId,
    ]);

    await this.lockSignatureKeys(currentSignatureKeys);
    await this.deleteMembershipsByProductDocIds([productDocId]);
    await this.refreshSignatureBitmaps(currentSignatureKeys);
  }

  private normalizeReplacement(
    replacement: OptionSignatureProductReplacementInput
  ): NormalizedProductReplacement {
    assertPositiveDocId(replacement.productDocId, "productDocId");
    const signatures = new Map<string, NormalizedProductSignature>();

    for (const variant of replacement.variants) {
      const valueKeys = normalizeOptionValueKeys(variant.valueKeys);
      const signatureKey = buildOptionSignatureKey(valueKeys);
      if (!signatureKey) {
        continue;
      }

      const current = signatures.get(signatureKey);
      if (current) {
        current.variantCount += 1;
        continue;
      }

      signatures.set(signatureKey, {
        signatureKey,
        valueKeys,
        variantCount: 1,
      });
    }

    return {
      productDocId: replacement.productDocId,
      signatures: [...signatures.values()].sort(compareProductSignatures),
    };
  }

  private groupNextSignatures(
    replacements: readonly NormalizedProductReplacement[]
  ): Map<string, SignatureGroup> {
    const groups = new Map<string, SignatureGroup>();

    for (const replacement of replacements) {
      for (const signature of replacement.signatures) {
        const group =
          groups.get(signature.signatureKey) ??
          {
            signatureKey: signature.signatureKey,
            valueKeys: signature.valueKeys,
            productVariantCounts: new Map<number, number>(),
          };

        if (!sameStringArray(group.valueKeys, signature.valueKeys)) {
          throw new Error(
            `Option signature value keys mismatch: ${signature.signatureKey}`
          );
        }

        group.productVariantCounts.set(
          replacement.productDocId,
          signature.variantCount
        );
        groups.set(signature.signatureKey, group);
      }
    }

    return new Map(
      [...groups.entries()].sort(([left], [right]) => compareStrings(left, right))
    );
  }

  private async getMembershipSignatureKeys(
    productDocIds: readonly number[]
  ): Promise<string[]> {
    if (productDocIds.length === 0) {
      return [];
    }

    const signatureKeys: string[] = [];
    for (const chunk of chunkArray(productDocIds)) {
      const rows = await this.connection
        .select({
          signatureKey: listingOptionSignatureProductMembership.signatureKey,
        })
        .from(listingOptionSignatureProductMembership)
        .where(
          and(
            eq(listingOptionSignatureProductMembership.storeId, this.storeId),
            inArray(
              listingOptionSignatureProductMembership.productDocId,
              chunk
            )
          )
        );

      signatureKeys.push(...rows.map((row) => row.signatureKey));
    }

    return uniqueSortedStrings(signatureKeys);
  }

  private async deleteMembershipsByProductDocIds(
    productDocIds: readonly number[]
  ): Promise<void> {
    for (const chunk of chunkArray(productDocIds)) {
      await this.connection
        .delete(listingOptionSignatureProductMembership)
        .where(
          and(
            eq(listingOptionSignatureProductMembership.storeId, this.storeId),
            inArray(
              listingOptionSignatureProductMembership.productDocId,
              chunk
            )
          )
        );
    }
  }

  private async lockSignatureKeys(signatureKeys: readonly string[]): Promise<void> {
    for (const signatureKey of uniqueSortedStrings(signatureKeys)) {
      await this.connection.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${this.lockKey(signatureKey)}, 0))`
      );
    }
  }

  private async ensureSignatureRows(
    groups: readonly SignatureGroup[]
  ): Promise<void> {
    for (const group of groups) {
      const productDocIds = [...group.productVariantCounts.keys()].sort(
        compareNumbers
      );
      const docIdsSql = this.docIdValuesSql(productDocIds);

      await this.connection.execute(sql`
        WITH docs(doc_id) AS (
          VALUES ${docIdsSql}
        ),
        bitmap AS (
          SELECT rb_build_agg(doc_id) AS value
          FROM docs
        )
        INSERT INTO listing.listing_option_signature (
          option_signature_id,
          store_id,
          signature_key,
          option_value_count,
          product_bitmap,
          cardinality,
          metadata,
          updated_at
        )
        SELECT
          ${randomUUID()}::uuid,
          ${this.storeId}::uuid,
          ${group.signatureKey},
          ${group.valueKeys.length},
          value,
          rb_cardinality(value),
          '{}'::jsonb,
          now()
        FROM bitmap
        ON CONFLICT (store_id, signature_key) DO UPDATE SET
          option_value_count = EXCLUDED.option_value_count,
          metadata = EXCLUDED.metadata,
          updated_at = now()
      `);
    }
  }

  private async getOptionSignatureIds(
    signatureKeys: readonly string[]
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    for (const chunk of chunkArray(signatureKeys)) {
      const rows = await this.connection
        .select({
          optionSignatureId: listingOptionSignature.optionSignatureId,
          signatureKey: listingOptionSignature.signatureKey,
        })
        .from(listingOptionSignature)
        .where(
          and(
            eq(listingOptionSignature.storeId, this.storeId),
            inArray(listingOptionSignature.signatureKey, chunk)
          )
        );

      for (const row of rows) {
        result.set(row.signatureKey, row.optionSignatureId);
      }
    }

    for (const signatureKey of signatureKeys) {
      if (!result.has(signatureKey)) {
        throw new Error(`Failed to resolve option signature: ${signatureKey}`);
      }
    }

    return result;
  }

  private async upsertSignatureValueRows(
    groups: ReadonlyMap<string, SignatureGroup>,
    optionSignatureIds: ReadonlyMap<string, string>
  ): Promise<void> {
    const rows = [...groups.values()]
      .flatMap((group) => {
        const optionSignatureId = optionSignatureIds.get(group.signatureKey);
        if (!optionSignatureId) {
          throw new Error(`Failed to resolve option signature: ${group.signatureKey}`);
        }

        return group.valueKeys.map((valueKey) => ({
          optionSignatureId,
          storeId: this.storeId,
          signatureKey: group.signatureKey,
          facetId: facetIdFromValueKey(valueKey),
          valueKey,
        }));
      })
      .sort(compareSignatureValueRows);

    for (const chunk of chunkArray(rows)) {
      await this.connection
        .insert(listingOptionSignatureValue)
        .values(chunk)
        .onConflictDoUpdate({
          target: [
            listingOptionSignatureValue.optionSignatureId,
            listingOptionSignatureValue.valueKey,
          ],
          set: {
            storeId: sql`excluded.store_id`,
            signatureKey: sql`excluded.signature_key`,
            facetId: sql`excluded.facet_id`,
          },
        });
    }
  }

  private async upsertMembershipRows(
    groups: ReadonlyMap<string, SignatureGroup>,
    optionSignatureIds: ReadonlyMap<string, string>
  ): Promise<void> {
    const now = nowIso();
    const rows = [...groups.values()]
      .flatMap((group) => {
        const optionSignatureId = optionSignatureIds.get(group.signatureKey);
        if (!optionSignatureId) {
          throw new Error(`Failed to resolve option signature: ${group.signatureKey}`);
        }

        return [...group.productVariantCounts.entries()].map(
          ([productDocId, variantCount]) => ({
            optionSignatureId,
            storeId: this.storeId,
            signatureKey: group.signatureKey,
            productDocId,
            variantCount,
            updatedAt: now,
          })
        );
      })
      .sort(compareMembershipRows);

    for (const chunk of chunkArray(rows)) {
      await this.connection
        .insert(listingOptionSignatureProductMembership)
        .values(chunk)
        .onConflictDoUpdate({
          target: [
            listingOptionSignatureProductMembership.optionSignatureId,
            listingOptionSignatureProductMembership.productDocId,
          ],
          set: {
            storeId: sql`excluded.store_id`,
            signatureKey: sql`excluded.signature_key`,
            variantCount: sql`excluded.variant_count`,
            updatedAt: now,
          },
        });
    }
  }

  private async refreshSignatureBitmaps(
    signatureKeys: readonly string[]
  ): Promise<void> {
    if (signatureKeys.length === 0) {
      return;
    }

    for (const chunk of chunkArray(signatureKeys)) {
      const signatureKeysSql = this.signatureKeyValuesSql(chunk);

      await this.connection.execute(sql`
        WITH touched(signature_key) AS (
          VALUES ${signatureKeysSql}
        ),
        aggregate AS (
          SELECT
            os.option_signature_id,
            rb_build_agg(m.product_doc_id) AS product_bitmap
          FROM listing.listing_option_signature os
          JOIN touched
            ON touched.signature_key = os.signature_key
          JOIN listing.listing_option_signature_product_membership m
            ON m.option_signature_id = os.option_signature_id
           AND m.store_id = os.store_id
          WHERE os.store_id = ${this.storeId}::uuid
          GROUP BY os.option_signature_id
        ),
        updated AS (
          UPDATE listing.listing_option_signature os
          SET
            product_bitmap = aggregate.product_bitmap,
            cardinality = rb_cardinality(aggregate.product_bitmap),
            updated_at = now()
          FROM aggregate
          WHERE os.option_signature_id = aggregate.option_signature_id
          RETURNING os.option_signature_id
        )
        DELETE FROM listing.listing_option_signature os
        USING touched
        WHERE os.store_id = ${this.storeId}::uuid
          AND os.signature_key = touched.signature_key
          AND NOT EXISTS (
            SELECT 1
            FROM listing.listing_option_signature_product_membership m
            WHERE m.option_signature_id = os.option_signature_id
              AND m.store_id = os.store_id
          )
      `);
    }
  }

  private docIdValuesSql(docIds: readonly number[]) {
    return sql.join(
      docIds.map((docId) => sql`(${docId}::int)`),
      sql`, `
    );
  }

  private signatureKeyValuesSql(signatureKeys: readonly string[]) {
    return sql.join(
      signatureKeys.map((signatureKey) => sql`(${signatureKey}::text)`),
      sql`, `
    );
  }

  private lockKey(signatureKey: string): string {
    return `listing_option_signature:${this.storeId}:${signatureKey}`;
  }
}

function facetIdFromValueKey(valueKey: string): string {
  const separatorIndex = valueKey.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex === valueKey.length - 1) {
    throw new Error(`Invalid option value key: ${valueKey}`);
  }

  return valueKey.slice(0, separatorIndex);
}

function uniqueSortedStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareStrings);
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function compareProductSignatures(
  left: NormalizedProductSignature,
  right: NormalizedProductSignature
): number {
  return compareStrings(left.signatureKey, right.signatureKey);
}

function compareSignatureValueRows(
  left: { signatureKey: string; valueKey: string },
  right: { signatureKey: string; valueKey: string }
): number {
  return (
    compareStrings(left.signatureKey, right.signatureKey) ||
    compareStrings(left.valueKey, right.valueKey)
  );
}

function compareMembershipRows(
  left: { signatureKey: string; productDocId: number },
  right: { signatureKey: string; productDocId: number }
): number {
  return (
    compareStrings(left.signatureKey, right.signatureKey) ||
    compareNumbers(left.productDocId, right.productDocId)
  );
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}

function compareNumbers(left: number, right: number): number {
  return left - right;
}
