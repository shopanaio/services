import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql, sum } from "drizzle-orm";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
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

const availableRewardRelayQuery = createRelayQuery(
  createQuery(rewardEntitlements).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "loyalty-available-reward", tieBreaker: "id" },
);

type AvailableRewardRelayInput = InferRelayInput<typeof availableRewardRelayQuery>;

export interface AvailableRewardConnectionInput {
  accountId: string;
  effectiveAt: string;
  first?: number;
  after?: string;
}

export interface AvailableRewardConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class RewardRepository extends BaseRepository {
  async getEntitlementEventsByIds(ids: readonly string[]): Promise<RewardEntitlementEvent[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(rewardEntitlementEvents)
      .where(
        and(
          eq(rewardEntitlementEvents.storeId, this.storeId),
          inArray(rewardEntitlementEvents.id, [...ids]),
        ),
      );
  }

  async getEntitlementEventsByEntitlementIds(
    ids: readonly string[],
  ): Promise<RewardEntitlementEvent[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(rewardEntitlementEvents)
      .where(
        and(
          eq(rewardEntitlementEvents.storeId, this.storeId),
          inArray(rewardEntitlementEvents.entitlementId, [...ids]),
        ),
      )
      .orderBy(asc(rewardEntitlementEvents.occurredAt), asc(rewardEntitlementEvents.id));
  }

  async getTierBenefitsByIds(ids: readonly string[]): Promise<TierRewardBenefit[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(tierRewardBenefits)
      .where(
        and(eq(tierRewardBenefits.storeId, this.storeId), inArray(tierRewardBenefits.id, [...ids])),
      );
  }

  async getTierBenefitsByTierIds(ids: readonly string[]): Promise<TierRewardBenefit[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(tierRewardBenefits)
      .where(
        and(
          eq(tierRewardBenefits.storeId, this.storeId),
          inArray(tierRewardBenefits.tierId, [...ids]),
        ),
      )
      .orderBy(asc(tierRewardBenefits.tierId), asc(tierRewardBenefits.id));
  }

  async findTierBenefitById(id: string): Promise<TierRewardBenefit | null> {
    const rows = await this.getTierBenefitsByIds([id]);
    return rows[0] ?? null;
  }

  async listEntitlementsFiltered(input: {
    accountIds?: readonly string[];
    rewardDefinitionIds?: readonly string[];
    statuses?: readonly RewardEntitlement["status"][];
    validAt?: string;
    limit: number;
  }): Promise<RewardEntitlement[]> {
    return this.connection
      .select()
      .from(rewardEntitlements)
      .where(
        and(
          eq(rewardEntitlements.storeId, this.storeId),
          input.accountIds?.length
            ? inArray(rewardEntitlements.accountId, [...input.accountIds])
            : undefined,
          input.rewardDefinitionIds?.length
            ? inArray(rewardEntitlements.rewardDefinitionId, [...input.rewardDefinitionIds])
            : undefined,
          input.statuses?.length
            ? inArray(rewardEntitlements.status, [...input.statuses])
            : undefined,
          input.validAt ? lte(rewardEntitlements.validFrom, input.validAt) : undefined,
          input.validAt
            ? or(isNull(rewardEntitlements.validTo), gt(rewardEntitlements.validTo, input.validAt))
            : undefined,
        ),
      )
      .orderBy(desc(rewardEntitlements.issuedAt), desc(rewardEntitlements.id))
      .limit(input.limit);
  }
  async getIssuanceCounts(
    definitionIds: readonly string[],
    accountIds: readonly string[],
  ): Promise<
    Array<{
      rewardDefinitionId: string;
      accountId: string | null;
      quantity: bigint;
    }>
  > {
    if (definitionIds.length === 0) return [];
    const totals = await this.connection
      .select({
        rewardDefinitionId: rewardEntitlements.rewardDefinitionId,
        quantity: sum(rewardEntitlements.quantity),
      })
      .from(rewardEntitlements)
      .where(
        and(
          eq(rewardEntitlements.storeId, this.storeId),
          inArray(rewardEntitlements.rewardDefinitionId, [...definitionIds]),
        ),
      )
      .groupBy(rewardEntitlements.rewardDefinitionId);
    const accounts =
      accountIds.length === 0
        ? []
        : await this.connection
            .select({
              rewardDefinitionId: rewardEntitlements.rewardDefinitionId,
              accountId: rewardEntitlements.accountId,
              quantity: sum(rewardEntitlements.quantity),
            })
            .from(rewardEntitlements)
            .where(
              and(
                eq(rewardEntitlements.storeId, this.storeId),
                inArray(rewardEntitlements.rewardDefinitionId, [...definitionIds]),
                inArray(rewardEntitlements.accountId, [...accountIds]),
              ),
            )
            .groupBy(rewardEntitlements.rewardDefinitionId, rewardEntitlements.accountId);
    return [
      ...totals.map((row) => ({
        rewardDefinitionId: row.rewardDefinitionId,
        accountId: null,
        quantity: BigInt(row.quantity ?? "0"),
      })),
      ...accounts.map((row) => ({
        rewardDefinitionId: row.rewardDefinitionId,
        accountId: row.accountId,
        quantity: BigInt(row.quantity ?? "0"),
      })),
    ];
  }

  async getAvailableConnection(
    input: AvailableRewardConnectionInput,
  ): Promise<AvailableRewardConnectionResult> {
    const where: AvailableRewardRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { accountId: { _eq: input.accountId } },
        { status: { _eq: "ISSUED" } },
        { validFrom: { _lte: input.effectiveAt } },
        {
          _or: [{ validTo: { _is: null } }, { validTo: { _gt: input.effectiveAt } }],
        },
      ],
    };
    const relayInput: AvailableRewardRelayInput = {
      first: input.first,
      after: input.after,
      where,
      orderBy: [
        { field: "issuedAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      availableRewardRelayQuery.execute(this.connection, relayInput),
      availableRewardRelayQuery.count(this.connection, { where }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  async getDefinitionsByIds(ids: readonly string[]): Promise<RewardDefinition[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(rewardDefinitions)
      .where(
        and(eq(rewardDefinitions.storeId, this.storeId), inArray(rewardDefinitions.id, [...ids])),
      );
  }

  async listDefinitionsForVersions(
    programVersionIds: readonly string[],
  ): Promise<RewardDefinition[]> {
    if (programVersionIds.length === 0) return [];
    return this.connection
      .select()
      .from(rewardDefinitions)
      .where(
        and(
          eq(rewardDefinitions.storeId, this.storeId),
          inArray(rewardDefinitions.programVersionId, [...programVersionIds]),
        ),
      )
      .orderBy(
        asc(rewardDefinitions.programVersionId),
        asc(rewardDefinitions.code),
        asc(rewardDefinitions.id),
      );
  }
  async findDefinitionById(id: string): Promise<RewardDefinition | null> {
    const rows = await this.connection
      .select()
      .from(rewardDefinitions)
      .where(and(eq(rewardDefinitions.storeId, this.storeId), eq(rewardDefinitions.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async lockDefinitionById(id: string): Promise<RewardDefinition | null> {
    const rows = await this.connection
      .select()
      .from(rewardDefinitions)
      .where(and(eq(rewardDefinitions.storeId, this.storeId), eq(rewardDefinitions.id, id)))
      .limit(1)
      .for("update");
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

  async createDefinition(input: Omit<NewRewardDefinition, "storeId">): Promise<RewardDefinition> {
    const rows = await this.connection
      .insert(rewardDefinitions)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async updateDefinition(
    id: string,
    input: Partial<Omit<NewRewardDefinition, "id" | "storeId" | "programVersionId" | "createdAt">>,
  ): Promise<RewardDefinition | null> {
    const rows = await this.connection
      .update(rewardDefinitions)
      .set(input)
      .where(and(eq(rewardDefinitions.storeId, this.storeId), eq(rewardDefinitions.id, id)))
      .returning();
    return rows[0] ?? null;
  }

  async deleteDefinition(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(rewardDefinitions)
      .where(and(eq(rewardDefinitions.storeId, this.storeId), eq(rewardDefinitions.id, id)))
      .returning({ id: rewardDefinitions.id });
    return rows.length > 0;
  }

  async findEntitlementById(id: string): Promise<RewardEntitlement | null> {
    const rows = await this.connection
      .select()
      .from(rewardEntitlements)
      .where(and(eq(rewardEntitlements.storeId, this.storeId), eq(rewardEntitlements.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findEntitlementByIdempotency(
    accountId: string,
    definitionId: string,
    idempotencyKey: string,
  ): Promise<RewardEntitlement | null> {
    const rows = await this.connection
      .select()
      .from(rewardEntitlements)
      .where(
        and(
          eq(rewardEntitlements.storeId, this.storeId),
          eq(rewardEntitlements.accountId, accountId),
          eq(rewardEntitlements.rewardDefinitionId, definitionId),
          eq(rewardEntitlements.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async lockEntitlementById(id: string): Promise<RewardEntitlement | null> {
    const rows = await this.connection
      .select()
      .from(rewardEntitlements)
      .where(and(eq(rewardEntitlements.storeId, this.storeId), eq(rewardEntitlements.id, id)))
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  async countIssued(definitionId: string, accountId?: string): Promise<bigint> {
    const rows = await this.connection
      .select({ value: sum(rewardEntitlements.quantity) })
      .from(rewardEntitlements)
      .where(
        and(
          eq(rewardEntitlements.storeId, this.storeId),
          eq(rewardEntitlements.rewardDefinitionId, definitionId),
          accountId ? eq(rewardEntitlements.accountId, accountId) : undefined,
        ),
      );
    return BigInt(rows[0]?.value ?? "0");
  }

  async getEntitlementsByIds(ids: readonly string[]): Promise<RewardEntitlement[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(rewardEntitlements)
      .where(
        and(eq(rewardEntitlements.storeId, this.storeId), inArray(rewardEntitlements.id, [...ids])),
      );
  }

  async listAvailableEntitlementsForAccounts(
    accountIds: readonly string[],
    at: string,
  ): Promise<RewardEntitlement[]> {
    if (accountIds.length === 0) return [];
    return this.connection
      .select()
      .from(rewardEntitlements)
      .where(
        and(
          eq(rewardEntitlements.storeId, this.storeId),
          inArray(rewardEntitlements.accountId, [...accountIds]),
          eq(rewardEntitlements.status, "ISSUED"),
          lte(rewardEntitlements.validFrom, at),
          or(isNull(rewardEntitlements.validTo), gt(rewardEntitlements.validTo, at)),
        ),
      )
      .orderBy(
        asc(rewardEntitlements.accountId),
        asc(rewardEntitlements.validTo),
        asc(rewardEntitlements.id),
      );
  }

  async listEntitlements(accountId: string, limit = 100): Promise<RewardEntitlement[]> {
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

  async listAvailableEntitlements(accountId: string, at: string): Promise<RewardEntitlement[]> {
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

  async listExpirationCandidates(at: string, limit = 100): Promise<RewardEntitlement[]> {
    return this.connection
      .select()
      .from(rewardEntitlements)
      .where(
        and(
          eq(rewardEntitlements.storeId, this.storeId),
          inArray(rewardEntitlements.status, ["ISSUED", "RESERVED"]),
          lte(rewardEntitlements.validTo, at),
        ),
      )
      .orderBy(asc(rewardEntitlements.validTo), asc(rewardEntitlements.id))
      .limit(limit)
      .for("update", { skipLocked: true });
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

  async findEntitlementEventByIdempotency(
    entitlementId: string,
    idempotencyKey: string,
  ): Promise<RewardEntitlementEvent | null> {
    const rows = await this.connection
      .select()
      .from(rewardEntitlementEvents)
      .where(
        and(
          eq(rewardEntitlementEvents.storeId, this.storeId),
          eq(rewardEntitlementEvents.entitlementId, entitlementId),
          eq(rewardEntitlementEvents.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async listEntitlementEvents(entitlementId: string): Promise<RewardEntitlementEvent[]> {
    return this.connection
      .select()
      .from(rewardEntitlementEvents)
      .where(
        and(
          eq(rewardEntitlementEvents.storeId, this.storeId),
          eq(rewardEntitlementEvents.entitlementId, entitlementId),
        ),
      )
      .orderBy(asc(rewardEntitlementEvents.occurredAt), asc(rewardEntitlementEvents.id));
  }

  async listTierBenefits(tierId: string): Promise<TierRewardBenefit[]> {
    return this.connection
      .select()
      .from(tierRewardBenefits)
      .where(
        and(eq(tierRewardBenefits.storeId, this.storeId), eq(tierRewardBenefits.tierId, tierId)),
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
      .where(and(eq(tierRewardBenefits.storeId, this.storeId), eq(tierRewardBenefits.id, id)))
      .returning({ id: tierRewardBenefits.id });
    return rows.length > 0;
  }
}
