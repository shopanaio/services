import { and, asc, desc, eq, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  tierMembershipEvents,
  tierMemberships,
  tierPolicies,
  tiers,
  type NewTier,
  type NewTierMembership,
  type NewTierMembershipEvent,
  type NewTierPolicy,
  type Tier,
  type TierMembership,
  type TierMembershipEvent,
  type TierPolicy,
} from "../models/index.js";

export class TierRepository extends BaseRepository {
  async findPolicy(programVersionId: string): Promise<TierPolicy | null> {
    const rows = await this.connection
      .select()
      .from(tierPolicies)
      .where(
        and(
          eq(tierPolicies.storeId, this.storeId),
          eq(tierPolicies.programVersionId, programVersionId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async createPolicy(input: Omit<NewTierPolicy, "storeId">): Promise<TierPolicy> {
    const rows = await this.connection
      .insert(tierPolicies)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async updatePolicy(
    programVersionId: string,
    input: Partial<Omit<NewTierPolicy, "id" | "storeId" | "programVersionId" | "createdAt">>,
  ): Promise<TierPolicy | null> {
    const rows = await this.connection
      .update(tierPolicies)
      .set(input)
      .where(
        and(
          eq(tierPolicies.storeId, this.storeId),
          eq(tierPolicies.programVersionId, programVersionId),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async deletePolicy(programVersionId: string): Promise<boolean> {
    const rows = await this.connection
      .delete(tierPolicies)
      .where(
        and(
          eq(tierPolicies.storeId, this.storeId),
          eq(tierPolicies.programVersionId, programVersionId),
        ),
      )
      .returning({ id: tierPolicies.id });
    return rows.length > 0;
  }

  async findTierById(id: string): Promise<Tier | null> {
    const rows = await this.connection
      .select()
      .from(tiers)
      .where(and(eq(tiers.storeId, this.storeId), eq(tiers.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async listForVersion(programVersionId: string): Promise<Tier[]> {
    return this.connection
      .select()
      .from(tiers)
      .where(
        and(
          eq(tiers.storeId, this.storeId),
          eq(tiers.programVersionId, programVersionId),
        ),
      )
      .orderBy(asc(tiers.rank), asc(tiers.id));
  }

  async createTier(input: Omit<NewTier, "storeId">): Promise<Tier> {
    const rows = await this.connection
      .insert(tiers)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async updateTier(
    id: string,
    input: Partial<Omit<NewTier, "id" | "storeId" | "programVersionId" | "createdAt">>,
  ): Promise<Tier | null> {
    const rows = await this.connection
      .update(tiers)
      .set(input)
      .where(and(eq(tiers.storeId, this.storeId), eq(tiers.id, id)))
      .returning();
    return rows[0] ?? null;
  }

  async deleteTier(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(tiers)
      .where(and(eq(tiers.storeId, this.storeId), eq(tiers.id, id)))
      .returning({ id: tiers.id });
    return rows.length > 0;
  }

  async findActiveMembership(accountId: string): Promise<TierMembership | null> {
    const rows = await this.connection
      .select()
      .from(tierMemberships)
      .where(
        and(
          eq(tierMemberships.storeId, this.storeId),
          eq(tierMemberships.accountId, accountId),
          eq(tierMemberships.status, "ACTIVE"),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async lockActiveMembership(accountId: string): Promise<TierMembership | null> {
    const rows = await this.connection
      .select()
      .from(tierMemberships)
      .where(
        and(
          eq(tierMemberships.storeId, this.storeId),
          eq(tierMemberships.accountId, accountId),
          eq(tierMemberships.status, "ACTIVE"),
        ),
      )
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  async createMembership(
    input: Omit<NewTierMembership, "storeId">,
  ): Promise<TierMembership> {
    const rows = await this.connection
      .insert(tierMemberships)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async updateMembership(
    id: string,
    expectedRevision: number,
    input: Partial<
      Pick<NewTierMembership, "tierId" | "status" | "effectiveTo">
    >,
  ): Promise<TierMembership | null> {
    const rows = await this.connection
      .update(tierMemberships)
      .set({
        ...input,
        revision: sql`${tierMemberships.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(tierMemberships.storeId, this.storeId),
          eq(tierMemberships.id, id),
          eq(tierMemberships.revision, expectedRevision),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async appendMembershipEvent(
    input: Omit<NewTierMembershipEvent, "storeId">,
  ): Promise<TierMembershipEvent> {
    const rows = await this.connection
      .insert(tierMembershipEvents)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async listMembershipEvents(
    accountId: string,
    limit = 100,
  ): Promise<TierMembershipEvent[]> {
    return this.connection
      .select()
      .from(tierMembershipEvents)
      .where(
        and(
          eq(tierMembershipEvents.storeId, this.storeId),
          eq(tierMembershipEvents.accountId, accountId),
        ),
      )
      .orderBy(
        desc(tierMembershipEvents.occurredAt),
        desc(tierMembershipEvents.id),
      )
      .limit(limit);
  }
}
