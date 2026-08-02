import { and, eq, inArray, lt, ne, sql } from "drizzle-orm";
import type { Pricing } from "@shopana/broker-types";
import type { Database } from "../../infrastructure/db/database.js";
import { discount, discountCode, discountCodeUsageCounter, discountRedemption, discountUsageCounter, discountUsageReservation } from "../../repositories/models/index.js";
import { canonicalJson } from "../canonicalJson.js";
import { PricingCheckoutError } from "../errors.js";
import { PricingCheckoutQuoteRepository } from "../infrastructure/PricingCheckoutQuoteRepository.js";

export class DiscountUsageReservationService {
  constructor(private readonly db: Database, private readonly quotes: PricingCheckoutQuoteRepository) {}
  async reserve(params: Pricing.ReserveCheckoutDiscountUsageParams): Promise<Pricing.ReserveCheckoutDiscountUsageResult> {
    if (Date.parse(params.expiresAt) <= Date.now()) throw new PricingCheckoutError("PRICING_CHECKOUT_REQUEST_INVALID", "Usage reservation expiry must be in the future", false);
    const quote = await this.quotes.getFinalById(params.storeId, params.quoteId);
    if (!quote || quote.checkoutId !== params.checkoutId || quote.revision !== params.quoteRevision || canonicalJson(quote.usageRequirements) !== canonicalJson(params.requirements)) throw new PricingCheckoutError("PRICING_QUOTE_SNAPSHOT_CONFLICT", "Usage requirements do not match the final quote", false);
    const groups = groupRequirements(params.requirements);
    return this.db.transaction(async (tx) => {
      const reservations: Array<{ applicationId: string; reservationId: string }> = [];
      for (const group of groups) {
        const groupKey = `${params.idempotencyKey}:${group.discountId}:${group.codeId ?? "automatic"}:${group.customerId ?? "guest"}`;
        let row = (await tx.select().from(discountUsageReservation).where(and(eq(discountUsageReservation.storeId, params.storeId), eq(discountUsageReservation.idempotencyKey, groupKey))).limit(1))[0];
        if (row) {
          const metadata = objectValue(row.metadata);
          const storedApplicationIds = stringArray(metadata.applicationIds).sort((left, right) => left.localeCompare(right));
          const expectedApplicationIds = [...group.applicationIds].sort((left, right) => left.localeCompare(right));
          const replayable = row.status === "ACTIVE" || row.status === "COMMITTED";
          if (!replayable || row.checkoutId !== params.checkoutId || row.discountId !== group.discountId || row.codeId !== group.codeId || row.customerId !== group.customerId || metadata.quoteId !== params.quoteId || metadata.quoteRevision !== params.quoteRevision || canonicalJson(storedApplicationIds) !== canonicalJson(expectedApplicationIds)) throw new PricingCheckoutError("PRICING_QUOTE_SNAPSHOT_CONFLICT", "Usage reservation idempotency key refers to a different or closed reservation", false);
        }
        if (!row) {
          const owner = (await tx.select().from(discount).where(and(eq(discount.storeId, params.storeId), eq(discount.id, group.discountId))).limit(1).for("update"))[0];
          if (!owner || String(owner.revision) !== group.configurationRevision) throw new PricingCheckoutError("PRICING_QUOTE_SNAPSHOT_CONFLICT", "Discount configuration changed before reservation", false);
          await expireReservations(tx, params.storeId, group.discountId);
          const aggregate = (await tx.select().from(discountUsageCounter).where(and(eq(discountUsageCounter.storeId, params.storeId), eq(discountUsageCounter.discountId, group.discountId))).limit(1).for("update"))[0];
          if (!aggregate) throw new PricingCheckoutError("PRICING_QUOTE_PERSISTENCE_FAILED", "Discount usage counter is missing", true);
          const used = aggregate.reservedCount + aggregate.committedCount - aggregate.reversedCount; if (owner.usageLimit !== null && used >= owner.usageLimit) throw new PricingCheckoutError("PRICING_DISCOUNT_USAGE_LIMIT_REACHED", "Discount usage limit was reached", false);
          if (owner.appliesOncePerCustomer && group.customerId) {
            const [active, redeemed] = await Promise.all([
              tx.select({ id: discountUsageReservation.id }).from(discountUsageReservation).where(and(eq(discountUsageReservation.storeId, params.storeId), eq(discountUsageReservation.discountId, group.discountId), eq(discountUsageReservation.customerId, group.customerId), inArray(discountUsageReservation.status, ["ACTIVE", "COMMITTED"]), ne(discountUsageReservation.checkoutId, params.checkoutId))).limit(1),
              tx.select({ id: discountRedemption.id }).from(discountRedemption).where(and(eq(discountRedemption.storeId, params.storeId), eq(discountRedemption.discountId, group.discountId), eq(discountRedemption.customerId, group.customerId), eq(discountRedemption.status, "COMMITTED"))).limit(1),
            ]);
            if (active.length || redeemed.length) throw new PricingCheckoutError("PRICING_DISCOUNT_USAGE_LIMIT_REACHED", "Discount can only be used once per customer", false);
          }
          if (group.codeId) { const code = (await tx.select().from(discountCode).where(and(eq(discountCode.storeId, params.storeId), eq(discountCode.id, group.codeId))).limit(1).for("update"))[0]; const counter = (await tx.select().from(discountCodeUsageCounter).where(and(eq(discountCodeUsageCounter.storeId, params.storeId), eq(discountCodeUsageCounter.codeId, group.codeId))).limit(1).for("update"))[0]; if (!counter) throw new PricingCheckoutError("PRICING_QUOTE_PERSISTENCE_FAILED", "Discount code usage counter is missing", true); const codeUsed = counter.reservedCount + counter.committedCount - counter.reversedCount; if (!code || code.status !== "ACTIVE" || code.discountId !== group.discountId || (code.usageLimit !== null && codeUsed >= code.usageLimit)) throw new PricingCheckoutError("PRICING_DISCOUNT_USAGE_LIMIT_REACHED", "Discount code is inactive or its usage limit was reached", false); await tx.update(discountCodeUsageCounter).set({ reservedCount: sql`${discountCodeUsageCounter.reservedCount} + 1`, version: sql`${discountCodeUsageCounter.version} + 1` }).where(eq(discountCodeUsageCounter.codeId, group.codeId)); }
          [row] = await tx.insert(discountUsageReservation).values({ storeId: params.storeId, discountId: group.discountId, codeId: group.codeId, customerId: group.customerId, checkoutId: params.checkoutId, idempotencyKey: groupKey, expiresAt: params.expiresAt, metadata: { quoteId: params.quoteId, quoteRevision: params.quoteRevision, applicationIds: group.applicationIds } }).returning();
          await tx.update(discountUsageCounter).set({ reservedCount: sql`${discountUsageCounter.reservedCount} + 1`, version: sql`${discountUsageCounter.version} + 1` }).where(eq(discountUsageCounter.discountId, group.discountId));
        }
        for (const applicationId of group.applicationIds) reservations.push({ applicationId, reservationId: row!.id });
      }
      return { reservations };
    });
  }
}

async function expireReservations(tx: any, storeId: string, discountId: string): Promise<void> {
  const expired = await tx.select().from(discountUsageReservation).where(and(eq(discountUsageReservation.storeId, storeId), eq(discountUsageReservation.discountId, discountId), eq(discountUsageReservation.status, "ACTIVE"), lt(discountUsageReservation.expiresAt, new Date().toISOString()))).orderBy(discountUsageReservation.id).for("update");
  if (!expired.length) return;
  await tx.update(discountUsageReservation).set({ status: "EXPIRED", closedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(inArray(discountUsageReservation.id, expired.map((row: typeof discountUsageReservation.$inferSelect) => row.id)));
  await tx.update(discountUsageCounter).set({ reservedCount: sql`${discountUsageCounter.reservedCount} - ${BigInt(expired.length)}`, version: sql`${discountUsageCounter.version} + 1` }).where(and(eq(discountUsageCounter.storeId, storeId), eq(discountUsageCounter.discountId, discountId)));
  const byCode = new Map<string, number>();
  for (const row of expired) if (row.codeId) byCode.set(row.codeId, (byCode.get(row.codeId) ?? 0) + 1);
  for (const [expiredCodeId, count] of [...byCode].sort(([left], [right]) => left.localeCompare(right))) await tx.update(discountCodeUsageCounter).set({ reservedCount: sql`${discountCodeUsageCounter.reservedCount} - ${BigInt(count)}`, version: sql`${discountCodeUsageCounter.version} + 1` }).where(and(eq(discountCodeUsageCounter.storeId, storeId), eq(discountCodeUsageCounter.codeId, expiredCodeId)));
}

function groupRequirements(requirements: readonly Pricing.PricingCheckoutDiscountUsageRequirement[]) { const groups = new Map<string, { discountId: string; codeId: string | null; customerId: string | null; configurationRevision: string; applicationIds: string[] }>(); for (const row of requirements.filter((requirement) => requirement.reservationRequired)) { const key = `${row.discountId}:${row.codeId ?? ""}:${row.customerId ?? ""}`; const group = groups.get(key) ?? { discountId: row.discountId, codeId: row.codeId, customerId: row.customerId, configurationRevision: row.configurationRevision, applicationIds: [] }; if (group.configurationRevision !== row.configurationRevision) throw new PricingCheckoutError("PRICING_QUOTE_SNAPSHOT_CONFLICT", "Requirements contain mixed configuration revisions", false); group.applicationIds.push(row.applicationId); groups.set(key, group); } return [...groups.values()].sort((a, b) => a.discountId.localeCompare(b.discountId) || (a.codeId ?? "").localeCompare(b.codeId ?? "")); }
function objectValue(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function stringArray(value: unknown): string[] { return Array.isArray(value) && value.every((row) => typeof row === "string") ? value : []; }
