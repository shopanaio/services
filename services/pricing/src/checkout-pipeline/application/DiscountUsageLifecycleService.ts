import type { Pricing } from "@shopana/broker-types";
import { and, eq, lte, sql } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/database.js";
import { discountCodeUsageCounter, discountRedemption, discountRedemptionAllocation, discountUsageCounter, discountUsageReservation } from "../../repositories/models/index.js";
import { PricingCheckoutError } from "../errors.js";
import { PricingCheckoutQuoteRepository } from "../infrastructure/PricingCheckoutQuoteRepository.js";

export class DiscountUsageLifecycleService {
  constructor(private readonly db: Database, private readonly quotes: PricingCheckoutQuoteRepository) {}

  async commit(params: Pricing.CommitCheckoutDiscountUsageParams): Promise<Pricing.CommitCheckoutDiscountUsageResult> {
    const quote = await this.quotes.getFinalById(params.storeId, params.quoteId);
    if (!quote || quote.checkoutId !== params.checkoutId || quote.revision !== params.quoteRevision) throw conflict("Final quote does not match usage commit");
    const ids = uniqueSorted(params.reservationIds);
    return this.db.transaction(async (tx) => {
      const result: Array<{ reservationId: string; redemptionId: string }> = [];
      for (const reservationId of ids) {
        const reservation = (await tx.select().from(discountUsageReservation).where(and(eq(discountUsageReservation.storeId, params.storeId), eq(discountUsageReservation.id, reservationId))).limit(1).for("update"))[0];
        if (!reservation || reservation.checkoutId !== params.checkoutId) throw conflict("Usage reservation does not belong to checkout");
        const existing = (await tx.select().from(discountRedemption).where(and(eq(discountRedemption.storeId, params.storeId), eq(discountRedemption.reservationId, reservationId))).limit(1))[0];
        if (existing) { if (existing.orderId !== params.orderId) throw conflict("Reservation was committed to another order"); result.push({ reservationId, redemptionId: existing.id }); continue; }
        if (reservation.status !== "ACTIVE" || Date.parse(reservation.expiresAt) <= Date.now()) throw conflict("Usage reservation is not active");
        const metadata = objectValue(reservation.metadata); const applicationIds = stringArray(metadata.applicationIds);
        if (metadata.quoteId !== params.quoteId || metadata.quoteRevision !== params.quoteRevision || !applicationIds.length) throw conflict("Usage reservation quote provenance is invalid");
        const applications = applicationIds.map((id) => quote.appliedDiscounts.find((app) => app.applicationId === id)).filter((app): app is Pricing.PricingCheckoutDiscountApplication => Boolean(app));
        if (applications.length !== applicationIds.length || applications.some((app) => app.discountId !== reservation.discountId || app.code?.codeId !== reservation.codeId)) throw conflict("Usage reservation applications do not match the final quote");
        const configurationRevision = Number(applications[0]!.configurationRevision);
        if (!Number.isSafeInteger(configurationRevision) || applications.some((app) => app.configurationRevision !== applications[0]!.configurationRevision || app.discountClass !== applications[0]!.discountClass)) throw conflict("Usage application configuration is invalid");
        await lockCounters(tx, params.storeId, reservation.discountId, reservation.codeId);
        const now = new Date().toISOString();
        await tx.update(discountUsageReservation).set({ status: "COMMITTED", committedAt: now, updatedAt: now }).where(eq(discountUsageReservation.id, reservation.id));
        await tx.update(discountUsageCounter).set({ reservedCount: sql`${discountUsageCounter.reservedCount} - 1`, committedCount: sql`${discountUsageCounter.committedCount} + 1`, version: sql`${discountUsageCounter.version} + 1`, updatedAt: now }).where(and(eq(discountUsageCounter.storeId, params.storeId), eq(discountUsageCounter.discountId, reservation.discountId)));
        if (reservation.codeId) await tx.update(discountCodeUsageCounter).set({ reservedCount: sql`${discountCodeUsageCounter.reservedCount} - 1`, committedCount: sql`${discountCodeUsageCounter.committedCount} + 1`, version: sql`${discountCodeUsageCounter.version} + 1`, updatedAt: now }).where(and(eq(discountCodeUsageCounter.storeId, params.storeId), eq(discountCodeUsageCounter.codeId, reservation.codeId)));
        const amount = applications.reduce((sum, app) => sum + BigInt(app.amount.amountMinor), 0n);
        const [redemption] = await tx.insert(discountRedemption).values({ storeId: params.storeId, discountId: reservation.discountId, codeId: reservation.codeId, reservationId: reservation.id, customerId: reservation.customerId, checkoutId: params.checkoutId, orderId: params.orderId, idempotencyKey: `${params.idempotencyKey}:${reservation.id}`, discountClass: applications[0]!.discountClass, configurationRevision, currency: quote.currencyCode as never, amountMinor: amount, committedAt: now, metadata: { quoteId: params.quoteId, quoteRevision: params.quoteRevision, applicationIds } }).returning();
        if (!redemption) throw new PricingCheckoutError("PRICING_QUOTE_PERSISTENCE_FAILED", "Discount redemption was not persisted", true);
        const allocations = applications.flatMap((app) => app.allocations.map((allocation) => ({ storeId: params.storeId, discountId: reservation.discountId, redemptionId: redemption.id, targetType: allocation.targetType === "LINE" ? "ORDER_LINE" as const : "SHIPPING_LINE" as const, targetId: allocation.targetType === "LINE" ? allocation.lineId : allocation.groupId, quantity: allocation.targetType === "LINE" ? allocation.quantity : null, amountMinor: BigInt(allocation.amount.amountMinor), metadata: { applicationId: app.applicationId } })));
        if (allocations.length) await tx.insert(discountRedemptionAllocation).values(allocations);
        result.push({ reservationId, redemptionId: redemption.id });
      }
      return { redemptions: result };
    });
  }

  async release(params: Pricing.ReleaseCheckoutDiscountUsageParams): Promise<Pricing.ReleaseCheckoutDiscountUsageResult> {
    const releasedReservationIds = await this.closeReservations(params.storeId, uniqueSorted(params.reservationIds), "RELEASED", new Date().toISOString());
    return { releasedReservationIds };
  }

  async expire(params: Pricing.ExpireCheckoutDiscountUsageParams): Promise<Pricing.ExpireCheckoutDiscountUsageResult> {
    const limit = Math.min(Math.max(params.limit ?? 100, 1), 500);
    const rows = await this.db.select({ id: discountUsageReservation.id }).from(discountUsageReservation).where(and(eq(discountUsageReservation.storeId, params.storeId), eq(discountUsageReservation.status, "ACTIVE"), lte(discountUsageReservation.expiresAt, params.effectiveAt))).orderBy(discountUsageReservation.expiresAt, discountUsageReservation.id).limit(limit);
    const expiredReservationIds = await this.closeReservations(params.storeId, rows.map((row) => row.id), "EXPIRED", params.effectiveAt);
    return { expiredReservationIds };
  }

  async reverse(params: Pricing.ReverseCheckoutDiscountUsageParams): Promise<Pricing.ReverseCheckoutDiscountUsageResult> {
    const ids = uniqueSorted(params.redemptionIds); const reason = params.reason.trim(); if (!reason) throw conflict("Reversal reason is required");
    return this.db.transaction(async (tx) => {
      const reversedRedemptionIds: string[] = [];
      for (const id of ids) {
        const redemption = (await tx.select().from(discountRedemption).where(and(eq(discountRedemption.storeId, params.storeId), eq(discountRedemption.id, id))).limit(1).for("update"))[0];
        if (!redemption || redemption.status === "REVERSED") continue;
        await lockCounters(tx, params.storeId, redemption.discountId, redemption.codeId);
        const now = new Date().toISOString();
        await tx.update(discountRedemption).set({ status: "REVERSED", reversedAt: now, reversalReason: reason }).where(eq(discountRedemption.id, id));
        await tx.update(discountUsageCounter).set({ reversedCount: sql`${discountUsageCounter.reversedCount} + 1`, version: sql`${discountUsageCounter.version} + 1`, updatedAt: now }).where(and(eq(discountUsageCounter.storeId, params.storeId), eq(discountUsageCounter.discountId, redemption.discountId)));
        if (redemption.codeId) await tx.update(discountCodeUsageCounter).set({ reversedCount: sql`${discountCodeUsageCounter.reversedCount} + 1`, version: sql`${discountCodeUsageCounter.version} + 1`, updatedAt: now }).where(and(eq(discountCodeUsageCounter.storeId, params.storeId), eq(discountCodeUsageCounter.codeId, redemption.codeId)));
        reversedRedemptionIds.push(id);
      }
      return { reversedRedemptionIds };
    });
  }

  private closeReservations(storeId: string, ids: readonly string[], status: "RELEASED" | "EXPIRED", closedAt: string): Promise<string[]> {
    return this.db.transaction(async (tx) => {
      const closed: string[] = [];
      for (const id of ids) {
        const row = (await tx.select().from(discountUsageReservation).where(and(eq(discountUsageReservation.storeId, storeId), eq(discountUsageReservation.id, id))).limit(1).for("update"))[0];
        if (!row || row.status !== "ACTIVE") continue;
        await lockCounters(tx, storeId, row.discountId, row.codeId);
        await tx.update(discountUsageReservation).set({ status, closedAt, updatedAt: closedAt }).where(eq(discountUsageReservation.id, id));
        await tx.update(discountUsageCounter).set({ reservedCount: sql`${discountUsageCounter.reservedCount} - 1`, version: sql`${discountUsageCounter.version} + 1`, updatedAt: closedAt }).where(and(eq(discountUsageCounter.storeId, storeId), eq(discountUsageCounter.discountId, row.discountId)));
        if (row.codeId) await tx.update(discountCodeUsageCounter).set({ reservedCount: sql`${discountCodeUsageCounter.reservedCount} - 1`, version: sql`${discountCodeUsageCounter.version} + 1`, updatedAt: closedAt }).where(and(eq(discountCodeUsageCounter.storeId, storeId), eq(discountCodeUsageCounter.codeId, row.codeId)));
        closed.push(id);
      }
      return closed;
    });
  }
}

async function lockCounters(tx: any, storeId: string, discountId: string, codeId: string | null) {
  const aggregate = (await tx.select().from(discountUsageCounter).where(and(eq(discountUsageCounter.storeId, storeId), eq(discountUsageCounter.discountId, discountId))).limit(1).for("update"))[0];
  if (!aggregate) throw new PricingCheckoutError("PRICING_QUOTE_PERSISTENCE_FAILED", "Discount usage counter is missing", true);
  if (codeId) { const code = (await tx.select().from(discountCodeUsageCounter).where(and(eq(discountCodeUsageCounter.storeId, storeId), eq(discountCodeUsageCounter.codeId, codeId))).limit(1).for("update"))[0]; if (!code) throw new PricingCheckoutError("PRICING_QUOTE_PERSISTENCE_FAILED", "Discount code usage counter is missing", true); }
}
function conflict(message: string) { return new PricingCheckoutError("PRICING_QUOTE_SNAPSHOT_CONFLICT", message, false); }
function uniqueSorted(values: readonly string[]) { return [...new Set(values)].sort((left, right) => left.localeCompare(right)); }
function objectValue(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function stringArray(value: unknown): string[] { return Array.isArray(value) && value.every((row) => typeof row === "string") ? value : []; }
