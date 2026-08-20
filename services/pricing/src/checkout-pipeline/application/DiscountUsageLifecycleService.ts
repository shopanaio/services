import type { Pricing } from "@shopana/broker-types";
import { and, eq, lte, sql } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/database.js";
import {
  discount,
  discountCode,
  discountCodeUsageCounter,
  discountRedemption,
  discountRedemptionAllocation,
  discountUsageCounter,
  discountUsageReservation,
} from "../../repositories/models/index.js";
import { canonicalJson } from "../canonicalJson.js";
import { PricingCheckoutError } from "../errors.js";
import { PricingCheckoutQuoteRepository } from "../infrastructure/PricingCheckoutQuoteRepository.js";

interface UsageGroup {
  key: string;
  discountId: string;
  codeId: string | null;
  customerId: string | null;
  configurationRevision: string;
  reservationRequired: boolean;
  applicationIds: string[];
}

export class DiscountUsageLifecycleService {
  constructor(
    private readonly db: Database,
    private readonly quotes: PricingCheckoutQuoteRepository,
  ) {}

  async commit(
    params: Pricing.CommitCheckoutDiscountUsageParams,
  ): Promise<Pricing.CommitCheckoutDiscountUsageResult> {
    const quote = await this.quotes.getFinalById(params.storeId, params.quoteId);
    if (
      !quote ||
      quote.checkoutId !== params.checkoutId ||
      quote.revision !== params.quoteRevision
    ) {
      throw conflict("Final quote does not match usage commit");
    }

    const groups = groupUsageRequirements(quote.usageRequirements);
    const reservationIds = uniqueSorted(params.reservationIds);

    return this.db.transaction(async (tx) => {
      // Reserve locks discount owners before reservations; commit must use the
      // same order to avoid a discount <-> reservation lock cycle.
      await lockDiscountOwners(tx, params.storeId, groups);

      const reservations = new Map<string, typeof discountUsageReservation.$inferSelect>();

      for (const reservationId of reservationIds) {
        const reservation = (
          await tx
            .select()
            .from(discountUsageReservation)
            .where(
              and(
                eq(discountUsageReservation.storeId, params.storeId),
                eq(discountUsageReservation.id, reservationId),
              ),
            )
            .limit(1)
            .for("update")
        )[0];
        if (!reservation || reservation.checkoutId !== params.checkoutId) {
          throw conflict("Usage reservation does not belong to checkout");
        }

        const group = groups.find(
          (candidate) =>
            candidate.reservationRequired &&
            candidate.discountId === reservation.discountId &&
            candidate.codeId === reservation.codeId &&
            candidate.customerId === reservation.customerId,
        );
        if (!group || reservations.has(group.key)) {
          throw conflict("Usage reservation does not match the final quote");
        }
        validateReservationProvenance(reservation, group, params);
        reservations.set(group.key, reservation);
      }

      const result: Array<{
        reservationId: string | null;
        redemptionId: string;
      }> = [];
      const consumedReservationIds = new Set<string>();

      for (const group of groups) {
        const applications = applicationsForGroup(quote, group);
        const reservation = reservations.get(group.key) ?? null;
        if (group.reservationRequired && !reservation) {
          throw conflict("A required usage reservation is missing");
        }

        const configurationRevision = Number(group.configurationRevision);
        if (!Number.isSafeInteger(configurationRevision)) {
          throw conflict("Usage application configuration is invalid");
        }
        const amountMinor = applications.reduce(
          (sum, application) => sum + BigInt(application.amount.amountMinor),
          0n,
        );
        const existing = (
          await tx
            .select()
            .from(discountRedemption)
            .where(
              and(
                eq(discountRedemption.storeId, params.storeId),
                eq(discountRedemption.discountId, group.discountId),
                eq(discountRedemption.orderId, params.orderId),
              ),
            )
            .limit(1)
            .for("update")
        )[0];

        if (existing) {
          validateExistingRedemption(
            existing,
            group,
            applications,
            reservation,
            params,
            quote.currencyCode,
            amountMinor,
          );
          if (reservation) consumedReservationIds.add(reservation.id);
          result.push({
            reservationId: existing.reservationId,
            redemptionId: existing.id,
          });
          continue;
        }

        if (reservation) {
          if (reservation.status !== "ACTIVE" || Date.parse(reservation.expiresAt) <= Date.now()) {
            throw conflict("Usage reservation is not active");
          }
        }

        await validateAndLockUsageConfiguration(tx, params.storeId, group);
        await lockCounters(tx, params.storeId, group.discountId, group.codeId);

        const now = new Date().toISOString();
        if (reservation) {
          await tx
            .update(discountUsageReservation)
            .set({ status: "COMMITTED", committedAt: now, updatedAt: now })
            .where(eq(discountUsageReservation.id, reservation.id));
          consumedReservationIds.add(reservation.id);
        }

        await tx
          .update(discountUsageCounter)
          .set({
            ...(reservation
              ? { reservedCount: sql`${discountUsageCounter.reservedCount} - 1` }
              : {}),
            committedCount: sql`${discountUsageCounter.committedCount} + 1`,
            version: sql`${discountUsageCounter.version} + 1`,
            updatedAt: now,
          })
          .where(
            and(
              eq(discountUsageCounter.storeId, params.storeId),
              eq(discountUsageCounter.discountId, group.discountId),
            ),
          );
        if (group.codeId) {
          await tx
            .update(discountCodeUsageCounter)
            .set({
              ...(reservation
                ? { reservedCount: sql`${discountCodeUsageCounter.reservedCount} - 1` }
                : {}),
              committedCount: sql`${discountCodeUsageCounter.committedCount} + 1`,
              version: sql`${discountCodeUsageCounter.version} + 1`,
              updatedAt: now,
            })
            .where(
              and(
                eq(discountCodeUsageCounter.storeId, params.storeId),
                eq(discountCodeUsageCounter.codeId, group.codeId),
              ),
            );
        }

        const [redemption] = await tx
          .insert(discountRedemption)
          .values({
            storeId: params.storeId,
            discountId: group.discountId,
            codeId: group.codeId,
            reservationId: reservation?.id ?? null,
            customerId: group.customerId,
            checkoutId: params.checkoutId,
            orderId: params.orderId,
            idempotencyKey: `${params.idempotencyKey}:${group.discountId}`,
            discountClass: applications[0]!.discountClass,
            configurationRevision,
            currency: quote.currencyCode as never,
            amountMinor,
            committedAt: now,
            metadata: {
              quoteId: params.quoteId,
              quoteRevision: params.quoteRevision,
              applicationIds: group.applicationIds,
            },
          })
          .returning();
        if (!redemption) {
          throw new PricingCheckoutError(
            "PRICING_QUOTE_PERSISTENCE_FAILED",
            "Discount redemption was not persisted",
            true,
          );
        }

        const allocations = applications.flatMap((application) =>
          application.allocations.map((allocation) => ({
            storeId: params.storeId,
            discountId: group.discountId,
            redemptionId: redemption.id,
            targetType:
              allocation.targetType === "LINE"
                ? ("ORDER_LINE" as const)
                : ("SHIPPING_LINE" as const),
            targetId: allocation.targetType === "LINE" ? allocation.lineId : allocation.groupId,
            quantity: allocation.targetType === "LINE" ? allocation.quantity : null,
            amountMinor: BigInt(allocation.amount.amountMinor),
            metadata: { applicationId: application.applicationId },
          })),
        );
        if (allocations.length > 0) {
          await tx.insert(discountRedemptionAllocation).values(allocations);
        }
        result.push({
          reservationId: reservation?.id ?? null,
          redemptionId: redemption.id,
        });
      }

      if (consumedReservationIds.size !== reservationIds.length) {
        throw conflict("Usage commit contains unrelated reservations");
      }
      return { redemptions: result };
    });
  }

  async release(
    params: Pricing.ReleaseCheckoutDiscountUsageParams,
  ): Promise<Pricing.ReleaseCheckoutDiscountUsageResult> {
    const releasedReservationIds = await this.closeReservations(
      params.storeId,
      uniqueSorted(params.reservationIds),
      "RELEASED",
      new Date().toISOString(),
    );
    return { releasedReservationIds };
  }

  async expire(
    params: Pricing.ExpireCheckoutDiscountUsageParams,
  ): Promise<Pricing.ExpireCheckoutDiscountUsageResult> {
    const limit = Math.min(Math.max(params.limit ?? 100, 1), 500);
    const rows = await this.db
      .select({ id: discountUsageReservation.id })
      .from(discountUsageReservation)
      .where(
        and(
          eq(discountUsageReservation.storeId, params.storeId),
          eq(discountUsageReservation.status, "ACTIVE"),
          lte(discountUsageReservation.expiresAt, params.effectiveAt),
        ),
      )
      .orderBy(discountUsageReservation.expiresAt, discountUsageReservation.id)
      .limit(limit);
    const expiredReservationIds = await this.closeReservations(
      params.storeId,
      rows.map((row) => row.id),
      "EXPIRED",
      params.effectiveAt,
    );
    return { expiredReservationIds };
  }

  async reverse(
    params: Pricing.ReverseCheckoutDiscountUsageParams,
  ): Promise<Pricing.ReverseCheckoutDiscountUsageResult> {
    const ids = uniqueSorted(params.redemptionIds);
    const reason = params.reason.trim();
    if (!reason) throw conflict("Reversal reason is required");

    return this.db.transaction(async (tx) => {
      const reversedRedemptionIds: string[] = [];
      for (const id of ids) {
        const redemption = (
          await tx
            .select()
            .from(discountRedemption)
            .where(
              and(eq(discountRedemption.storeId, params.storeId), eq(discountRedemption.id, id)),
            )
            .limit(1)
            .for("update")
        )[0];
        if (!redemption || redemption.status === "REVERSED") continue;

        await lockCounters(tx, params.storeId, redemption.discountId, redemption.codeId);
        const now = new Date().toISOString();
        await tx
          .update(discountRedemption)
          .set({
            status: "REVERSED",
            reversedAt: now,
            reversalReason: reason,
          })
          .where(eq(discountRedemption.id, id));
        await tx
          .update(discountUsageCounter)
          .set({
            reversedCount: sql`${discountUsageCounter.reversedCount} + 1`,
            version: sql`${discountUsageCounter.version} + 1`,
            updatedAt: now,
          })
          .where(
            and(
              eq(discountUsageCounter.storeId, params.storeId),
              eq(discountUsageCounter.discountId, redemption.discountId),
            ),
          );
        if (redemption.codeId) {
          await tx
            .update(discountCodeUsageCounter)
            .set({
              reversedCount: sql`${discountCodeUsageCounter.reversedCount} + 1`,
              version: sql`${discountCodeUsageCounter.version} + 1`,
              updatedAt: now,
            })
            .where(
              and(
                eq(discountCodeUsageCounter.storeId, params.storeId),
                eq(discountCodeUsageCounter.codeId, redemption.codeId),
              ),
            );
        }
        reversedRedemptionIds.push(id);
      }
      return { reversedRedemptionIds };
    });
  }

  private closeReservations(
    storeId: string,
    ids: readonly string[],
    status: "RELEASED" | "EXPIRED",
    closedAt: string,
  ): Promise<string[]> {
    return this.db.transaction(async (tx) => {
      const closed: string[] = [];
      for (const id of ids) {
        const row = (
          await tx
            .select()
            .from(discountUsageReservation)
            .where(
              and(
                eq(discountUsageReservation.storeId, storeId),
                eq(discountUsageReservation.id, id),
              ),
            )
            .limit(1)
            .for("update")
        )[0];
        if (!row || row.status !== "ACTIVE") continue;

        await lockCounters(tx, storeId, row.discountId, row.codeId);
        await tx
          .update(discountUsageReservation)
          .set({ status, closedAt, updatedAt: closedAt })
          .where(eq(discountUsageReservation.id, id));
        await tx
          .update(discountUsageCounter)
          .set({
            reservedCount: sql`${discountUsageCounter.reservedCount} - 1`,
            version: sql`${discountUsageCounter.version} + 1`,
            updatedAt: closedAt,
          })
          .where(
            and(
              eq(discountUsageCounter.storeId, storeId),
              eq(discountUsageCounter.discountId, row.discountId),
            ),
          );
        if (row.codeId) {
          await tx
            .update(discountCodeUsageCounter)
            .set({
              reservedCount: sql`${discountCodeUsageCounter.reservedCount} - 1`,
              version: sql`${discountCodeUsageCounter.version} + 1`,
              updatedAt: closedAt,
            })
            .where(
              and(
                eq(discountCodeUsageCounter.storeId, storeId),
                eq(discountCodeUsageCounter.codeId, row.codeId),
              ),
            );
        }
        closed.push(id);
      }
      return closed;
    });
  }
}

export function groupUsageRequirements(
  requirements: readonly Pricing.PricingCheckoutDiscountUsageRequirement[],
): UsageGroup[] {
  const groups = new Map<string, UsageGroup>();
  const applicationIds = new Set<string>();

  for (const requirement of requirements) {
    if (applicationIds.has(requirement.applicationId)) {
      throw conflict("Usage requirements contain duplicate applications");
    }
    applicationIds.add(requirement.applicationId);

    const key = canonicalJson([requirement.discountId, requirement.codeId, requirement.customerId]);
    const group = groups.get(key) ?? {
      key,
      discountId: requirement.discountId,
      codeId: requirement.codeId,
      customerId: requirement.customerId,
      configurationRevision: requirement.configurationRevision,
      reservationRequired: requirement.reservationRequired,
      applicationIds: [],
    };
    if (
      group.configurationRevision !== requirement.configurationRevision ||
      group.reservationRequired !== requirement.reservationRequired
    ) {
      throw conflict("Usage requirements contain inconsistent discount state");
    }
    group.applicationIds.push(requirement.applicationId);
    groups.set(key, group);
  }

  const result = [...groups.values()];
  const discounts = new Set<string>();
  for (const group of result) {
    if (discounts.has(group.discountId)) {
      throw conflict("A discount has multiple usage identities in one quote");
    }
    discounts.add(group.discountId);
    group.applicationIds.sort((left, right) => left.localeCompare(right));
  }
  return result.sort(
    (left, right) =>
      left.discountId.localeCompare(right.discountId) ||
      (left.codeId ?? "").localeCompare(right.codeId ?? "") ||
      (left.customerId ?? "").localeCompare(right.customerId ?? ""),
  );
}

function applicationsForGroup(
  quote: Pricing.FinalizeCheckoutPricingQuoteResult,
  group: UsageGroup,
): Pricing.PricingCheckoutDiscountApplication[] {
  const applications = group.applicationIds.map((applicationId) =>
    quote.appliedDiscounts.find((application) => application.applicationId === applicationId),
  );
  if (applications.some((application): application is undefined => application === undefined)) {
    throw conflict("Usage application is missing from the final quote");
  }

  const resolved = applications as Pricing.PricingCheckoutDiscountApplication[];
  if (
    resolved.length === 0 ||
    resolved.some(
      (application) =>
        application.discountId !== group.discountId ||
        (application.code?.codeId ?? null) !== group.codeId ||
        application.configurationRevision !== group.configurationRevision ||
        application.discountClass !== resolved[0]!.discountClass,
    )
  ) {
    throw conflict("Usage applications do not share one discount identity");
  }
  return resolved;
}

function validateReservationProvenance(
  reservation: typeof discountUsageReservation.$inferSelect,
  group: UsageGroup,
  params: Pricing.CommitCheckoutDiscountUsageParams,
): void {
  const metadata = objectValue(reservation.metadata);
  const applicationIds = stringArray(metadata.applicationIds).sort((left, right) =>
    left.localeCompare(right),
  );
  if (
    metadata.quoteId !== params.quoteId ||
    metadata.quoteRevision !== params.quoteRevision ||
    canonicalJson(applicationIds) !== canonicalJson(group.applicationIds)
  ) {
    throw conflict("Usage reservation quote provenance is invalid");
  }
}

function validateExistingRedemption(
  redemption: typeof discountRedemption.$inferSelect,
  group: UsageGroup,
  applications: readonly Pricing.PricingCheckoutDiscountApplication[],
  reservation: typeof discountUsageReservation.$inferSelect | null,
  params: Pricing.CommitCheckoutDiscountUsageParams,
  currencyCode: string,
  amountMinor: bigint,
): void {
  const metadata = objectValue(redemption.metadata);
  const applicationIds = stringArray(metadata.applicationIds).sort((left, right) =>
    left.localeCompare(right),
  );
  if (
    redemption.checkoutId !== params.checkoutId ||
    redemption.codeId !== group.codeId ||
    redemption.customerId !== group.customerId ||
    redemption.reservationId !== (reservation?.id ?? null) ||
    String(redemption.configurationRevision) !== group.configurationRevision ||
    redemption.discountClass !== applications[0]!.discountClass ||
    redemption.currency !== currencyCode ||
    redemption.amountMinor !== amountMinor ||
    metadata.quoteId !== params.quoteId ||
    metadata.quoteRevision !== params.quoteRevision ||
    canonicalJson(applicationIds) !== canonicalJson(group.applicationIds) ||
    (reservation !== null && reservation.status !== "COMMITTED")
  ) {
    throw conflict("Existing discount redemption does not match usage commit");
  }
}

async function lockDiscountOwners(
  tx: any,
  storeId: string,
  groups: readonly UsageGroup[],
): Promise<void> {
  for (const discountId of uniqueSorted(groups.map((group) => group.discountId))) {
    const owner = (
      await tx
        .select({ id: discount.id })
        .from(discount)
        .where(and(eq(discount.storeId, storeId), eq(discount.id, discountId)))
        .limit(1)
        .for("update")
    )[0];
    if (!owner) {
      throw conflict("Discount configuration changed before usage commit");
    }
  }
}

async function validateAndLockUsageConfiguration(
  tx: any,
  storeId: string,
  group: UsageGroup,
): Promise<void> {
  const owner = (
    await tx
      .select()
      .from(discount)
      .where(and(eq(discount.storeId, storeId), eq(discount.id, group.discountId)))
      .limit(1)
      .for("update")
  )[0];
  if (!owner || String(owner.revision) !== group.configurationRevision) {
    throw conflict("Discount configuration changed before usage commit");
  }
  if (!group.reservationRequired) {
    const effectiveAt = Date.now();
    if (
      owner.state !== "ACTIVE" ||
      Date.parse(owner.startsAt) > effectiveAt ||
      (owner.endsAt !== null && Date.parse(owner.endsAt) <= effectiveAt)
    ) {
      throw conflict("Discount is not active at usage commit");
    }
    if (owner.usageLimit !== null || owner.appliesOncePerCustomer) {
      throw conflict("Limited discount usage must be reserved before commit");
    }
  }

  if (!group.codeId) return;
  const code = (
    await tx
      .select()
      .from(discountCode)
      .where(and(eq(discountCode.storeId, storeId), eq(discountCode.id, group.codeId)))
      .limit(1)
      .for("update")
  )[0];
  if (
    !code ||
    code.discountId !== group.discountId ||
    code.status !== "ACTIVE" ||
    (!group.reservationRequired && code.usageLimit !== null)
  ) {
    throw conflict("Discount code configuration changed before usage commit");
  }
}

async function lockCounters(
  tx: any,
  storeId: string,
  discountId: string,
  codeId: string | null,
): Promise<void> {
  const aggregate = (
    await tx
      .select()
      .from(discountUsageCounter)
      .where(
        and(
          eq(discountUsageCounter.storeId, storeId),
          eq(discountUsageCounter.discountId, discountId),
        ),
      )
      .limit(1)
      .for("update")
  )[0];
  if (!aggregate) {
    throw new PricingCheckoutError(
      "PRICING_QUOTE_PERSISTENCE_FAILED",
      "Discount usage counter is missing",
      true,
    );
  }
  if (!codeId) return;

  const code = (
    await tx
      .select()
      .from(discountCodeUsageCounter)
      .where(
        and(
          eq(discountCodeUsageCounter.storeId, storeId),
          eq(discountCodeUsageCounter.codeId, codeId),
        ),
      )
      .limit(1)
      .for("update")
  )[0];
  if (!code) {
    throw new PricingCheckoutError(
      "PRICING_QUOTE_PERSISTENCE_FAILED",
      "Discount code usage counter is missing",
      true,
    );
  }
}

function conflict(message: string): PricingCheckoutError {
  return new PricingCheckoutError("PRICING_QUOTE_SNAPSHOT_CONFLICT", message, false);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((row) => typeof row === "string") ? value : [];
}
