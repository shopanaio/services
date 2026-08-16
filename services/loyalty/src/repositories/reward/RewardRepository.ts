import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  rewardDefinitions,
  rewardEntitlementEvents,
  rewardEntitlements,
  tierRewardBenefits,
  type NewRewardDefinition,
  type NewRewardEntitlement,
  type NewRewardEntitlementEvent,
  type NewTierRewardBenefit,
  type RewardDefinition,
  type RewardEntitlement,
  type RewardEntitlementEvent,
  type TierRewardBenefit,
} from "../models/index.js";

export class RewardRepository extends BaseRepository {
  async findDefinitionById(id: string): Promise<RewardDefinition | null> {
    const rows = await this.connection
      .select()
      .from(rewardDefinitions)
      .where(
        and(
          eq(rewardDefinitions.storeId, this.storeId),
          eq(rewardDefinitions.id, id),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findDefinitionByCode(
    programVersionId: string,
    code: string,
  ): Promise<RewardDefinition | null> {
    const rows = await this.connection
      .select()
      .from(rewardDefinitions)
      .where(
        and(
          eq(rewardDefinitions.storeId, this.storeId),
          eq(rewardDefinitions.programVersionId, programVersionId),
          eq(rewardDefinitions.code, code),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async listDefinitions(programVersionId: string): Promise<RewardDefinition[]> {
    return this.connection
      .select()
      .from(rewardDefinitions)
      .where(
        and(
          eq(rewardDefinitions.storeId, this.storeId),
          eq(rewardDefinitions.programVersionId, programVersionId),
        ),
      )
      .orderBy(asc(rewardDefinitions.code), asc(rewardDefinitions.id));
  }

  async createDefinition(
    input: Omit<NewRewardDefinition, "storeId">,
  ): Promise<RewardDefinition> {
    const rows = await this.connection
      .insert(rewardDefinitions)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async updateDefinition(
    id: string,
    input: Partial<
      Omit<
        NewRewardDefinition,
        "id" | "storeId" | "programVersionId" | "createdAt"
      >
    >,
  ): Promise<RewardDefinition | null> {
    const rows = await this.connection
      .update(rewardDefinitions)
      .set(input)
      .where(
        and(
          eq(rewardDefinitions.storeId, this.storeId),
          eq(rewardDefinitions.id, id),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async deleteDefinition(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(rewardDefinitions)
      .where(
        and(
          eq(rewardDefinitions.storeId, this.storeId),
          eq(rewardDefinitions.id, id),
        ),
      )
      .returning({ id: rewardDefinitions.id });
    return rows.length > 0;
  }

  async findEntitlementById(id: string): Promise<RewardEntitlement | null> {
    const rows = await this.connection
      .select()
      .from(rewardEntitlements)
      .where(
        and(
          eq(rewardEntitlements.storeId, this.storeId),
          eq(rewardEntitlements.id, id),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async getEntitlementsByIds(
    ids: readonly string[],
  ): Promise<RewardEntitlement[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(rewardEntitlements)
      .where(
        and(
          eq(rewardEntitlements.storeId, this.storeId),
          inArray(rewardEntitlements.id, [...ids]),
        ),
      );
  }

  async listEntitlements(
    accountId: string,
    limit = 100,
  ): Promise<RewardEntitlement[]> {
    return this.connection
      .select()
      .from(rewardEntitlements)
      .where(
        and(
          eq(rewardEntitlements.storeId, this.storeId),
          eq(rewardEntitlements.accountId, accountId),
        ),
      )
      .orderBy(desc(rewardEntitlements.issuedAt), desc(rewardEntitlements.id))
      .limit(limit);
  }

  async listAvailableEntitlements(
    accountId: string,
    at: string,
  ): Promise<RewardEntitlement[]> {
    return this.connection
      .select()
      .from(rewardEntitlements)
      .where(
        and(
          eq(rewardEntitlements.storeId, this.storeId),
          eq(rewardEntitlements.accountId, accountId),
          eq(rewardEntitlements.status, "ISSUED"),
          lte(rewardEntitlements.validFrom, at),
          or(isNull(rewardEntitlements.validTo), gt(rewardEntitlements.validTo, at)),
        ),
      )
      .orderBy(asc(rewardEntitlements.validTo), asc(rewardEntitlements.id));
  }

  async createEntitlement(
    input: Omit<NewRewardEntitlement, "storeId">,
  ): Promise<RewardEntitlement> {
    const rows = await this.connection
      .insert(rewardEntitlements)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async updateEntitlementState(
    id: string,
    expectedRevision: number,
    input: Partial<
      Pick<
        NewRewardEntitlement,
        | "status"
        | "reservedForCheckoutId"
        | "redeemedOrderId"
        | "externalReference"
        | "reservedAt"
        | "redeemedAt"
        | "expiredAt"
        | "revokedAt"
      >
    >,
  ): Promise<RewardEntitlement | null> {
    const rows = await this.connection
      .update(rewardEntitlements)
      .set({
        ...input,
        revision: sql`${rewardEntitlements.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(rewardEntitlements.storeId, this.storeId),
          eq(rewardEntitlements.id, id),
          eq(rewardEntitlements.revision, expectedRevision),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async appendEntitlementEvent(
    input: Omit<NewRewardEntitlementEvent, "storeId">,
  ): Promise<RewardEntitlementEvent> {
    const rows = await this.connection
      .insert(rewardEntitlementEvents)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async listEntitlementEvents(
    entitlementId: string,
  ): Promise<RewardEntitlementEvent[]> {
    return this.connection
      .select()
      .from(rewardEntitlementEvents)
      .where(
        and(
          eq(rewardEntitlementEvents.storeId, this.storeId),
          eq(rewardEntitlementEvents.entitlementId, entitlementId),
        ),
      )
      .orderBy(
        asc(rewardEntitlementEvents.occurredAt),
        asc(rewardEntitlementEvents.id),
      );
  }

  async listTierBenefits(tierId: string): Promise<TierRewardBenefit[]> {
    return this.connection
      .select()
      .from(tierRewardBenefits)
      .where(
        and(
          eq(tierRewardBenefits.storeId, this.storeId),
          eq(tierRewardBenefits.tierId, tierId),
        ),
      )
      .orderBy(asc(tierRewardBenefits.id));
  }

  async createTierBenefit(
    input: Omit<NewTierRewardBenefit, "storeId">,
  ): Promise<TierRewardBenefit> {
    const rows = await this.connection
      .insert(tierRewardBenefits)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async deleteTierBenefit(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(tierRewardBenefits)
      .where(
        and(
          eq(tierRewardBenefits.storeId, this.storeId),
          eq(tierRewardBenefits.id, id),
        ),
      )
      .returning({ id: tierRewardBenefits.id });
    return rows.length > 0;
  }
}
