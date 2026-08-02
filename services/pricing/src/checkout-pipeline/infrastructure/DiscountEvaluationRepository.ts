import { asc, eq } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/database.js";
import { discount, discountAmountOff, discountBuyXGetY, discountBuyerContext, discountChannel, discountCode, discountCodeUsageCounter, discountCombinationClass, discountEligibleCustomer, discountEligibleSegment, discountFreeShipping, discountMinimumRequirement, discountRedemption, discountTarget, discountTargetSelection, discountUsageCounter, discountUsageReservation } from "../../repositories/models/index.js";

export interface DiscountEvaluationSnapshot {
  discounts: Array<typeof discount.$inferSelect>; codes: Array<typeof discountCode.$inferSelect>;
  amountOff: Array<typeof discountAmountOff.$inferSelect>; buyXGetY: Array<typeof discountBuyXGetY.$inferSelect>; freeShipping: Array<typeof discountFreeShipping.$inferSelect>;
  minimums: Array<typeof discountMinimumRequirement.$inferSelect>; selections: Array<typeof discountTargetSelection.$inferSelect>; targets: Array<typeof discountTarget.$inferSelect>;
  channels: Array<typeof discountChannel.$inferSelect>; combinations: Array<typeof discountCombinationClass.$inferSelect>; buyerContexts: Array<typeof discountBuyerContext.$inferSelect>;
  customers: Array<typeof discountEligibleCustomer.$inferSelect>; segments: Array<typeof discountEligibleSegment.$inferSelect>; counters: Array<typeof discountUsageCounter.$inferSelect>; codeCounters: Array<typeof discountCodeUsageCounter.$inferSelect>;
  reservations: Array<typeof discountUsageReservation.$inferSelect>; redemptions: Array<typeof discountRedemption.$inferSelect>;
}

export class DiscountEvaluationRepository {
  constructor(private readonly db: Database) {}
  read(storeId: string): Promise<DiscountEvaluationSnapshot> {
    return this.db.transaction(async (tx) => {
      const read = <T>(table: any, ...order: any[]) =>
        tx
          .select()
          .from(table)
          .where(eq(table.storeId, storeId))
          .orderBy(...order.map((column) => asc(column))) as unknown as Promise<T[]>;
      const [discounts, codes, amountOff, buyXGetY, freeShipping, minimums, selections, targets, channels, combinations, buyerContexts, customers, segments, counters, codeCounters, reservations, redemptions] = await Promise.all([
        read<typeof discount.$inferSelect>(discount, discount.id),
        read<typeof discountCode.$inferSelect>(discountCode, discountCode.discountId, discountCode.id),
        read<typeof discountAmountOff.$inferSelect>(discountAmountOff, discountAmountOff.discountId),
        read<typeof discountBuyXGetY.$inferSelect>(discountBuyXGetY, discountBuyXGetY.discountId),
        read<typeof discountFreeShipping.$inferSelect>(discountFreeShipping, discountFreeShipping.discountId),
        read<typeof discountMinimumRequirement.$inferSelect>(discountMinimumRequirement, discountMinimumRequirement.discountId),
        read<typeof discountTargetSelection.$inferSelect>(discountTargetSelection, discountTargetSelection.discountId, discountTargetSelection.role),
        read<typeof discountTarget.$inferSelect>(discountTarget, discountTarget.discountId, discountTarget.role, discountTarget.targetId),
        read<typeof discountChannel.$inferSelect>(discountChannel, discountChannel.discountId, discountChannel.channelCode),
        read<typeof discountCombinationClass.$inferSelect>(discountCombinationClass, discountCombinationClass.discountId, discountCombinationClass.combinesWithClass),
        read<typeof discountBuyerContext.$inferSelect>(discountBuyerContext, discountBuyerContext.discountId),
        read<typeof discountEligibleCustomer.$inferSelect>(discountEligibleCustomer, discountEligibleCustomer.discountId, discountEligibleCustomer.customerId),
        read<typeof discountEligibleSegment.$inferSelect>(discountEligibleSegment, discountEligibleSegment.discountId, discountEligibleSegment.segmentId),
        read<typeof discountUsageCounter.$inferSelect>(discountUsageCounter, discountUsageCounter.discountId),
        read<typeof discountCodeUsageCounter.$inferSelect>(discountCodeUsageCounter, discountCodeUsageCounter.discountId, discountCodeUsageCounter.codeId),
        read<typeof discountUsageReservation.$inferSelect>(discountUsageReservation, discountUsageReservation.discountId, discountUsageReservation.id),
        read<typeof discountRedemption.$inferSelect>(discountRedemption, discountRedemption.discountId, discountRedemption.id),
      ]);
      return { discounts, codes, amountOff, buyXGetY, freeShipping, minimums, selections, targets, channels, combinations, buyerContexts, customers, segments, counters, codeCounters, reservations, redemptions };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });
  }
}
