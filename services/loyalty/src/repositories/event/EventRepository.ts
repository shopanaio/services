import { and, desc, eq, gt, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  earningRuleUsages,
  eventEvaluations,
  eventFacts,
  type EarningRuleUsage,
  type EventEvaluation,
  type EventFact,
  type NewEarningRuleUsage,
  type NewEventEvaluation,
  type NewEventFact,
} from "../models/index.js";

export class EventRepository extends BaseRepository {
  async getFactsByIds(ids: readonly string[]): Promise<EventFact[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(eventFacts)
      .where(and(eq(eventFacts.storeId, this.storeId), inArray(eventFacts.id, [...ids])));
  }

  async getEvaluationsByIds(ids: readonly string[]): Promise<EventEvaluation[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(eventEvaluations)
      .where(
        and(eq(eventEvaluations.storeId, this.storeId), inArray(eventEvaluations.id, [...ids])),
      );
  }

  async getUsagesByIds(ids: readonly string[]): Promise<EarningRuleUsage[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(earningRuleUsages)
      .where(
        and(eq(earningRuleUsages.storeId, this.storeId), inArray(earningRuleUsages.id, [...ids])),
      );
  }

  async listFacts(input: {
    customerIds?: readonly string[];
    producers?: readonly string[];
    eventTypes?: readonly string[];
    occurredFrom?: string;
    occurredTo?: string;
    limit: number;
  }): Promise<EventFact[]> {
    return this.connection
      .select()
      .from(eventFacts)
      .where(
        and(
          eq(eventFacts.storeId, this.storeId),
          input.customerIds?.length
            ? inArray(eventFacts.customerId, [...input.customerIds])
            : undefined,
          input.producers?.length ? inArray(eventFacts.producer, [...input.producers]) : undefined,
          input.eventTypes?.length
            ? inArray(eventFacts.eventType, [...input.eventTypes])
            : undefined,
          input.occurredFrom ? gte(eventFacts.occurredAt, input.occurredFrom) : undefined,
          input.occurredTo ? lte(eventFacts.occurredAt, input.occurredTo) : undefined,
        ),
      )
      .orderBy(desc(eventFacts.occurredAt), desc(eventFacts.id))
      .limit(input.limit);
  }

  async listEvaluationsFiltered(input: {
    eventFactId?: string;
    accountId?: string;
    earningRuleId?: string;
    decisions?: readonly EventEvaluation["decision"][];
    limit: number;
  }): Promise<EventEvaluation[]> {
    return this.connection
      .select()
      .from(eventEvaluations)
      .where(
        and(
          eq(eventEvaluations.storeId, this.storeId),
          input.eventFactId ? eq(eventEvaluations.eventFactId, input.eventFactId) : undefined,
          input.accountId ? eq(eventEvaluations.accountId, input.accountId) : undefined,
          input.earningRuleId ? eq(eventEvaluations.earningRuleId, input.earningRuleId) : undefined,
          input.decisions?.length
            ? inArray(eventEvaluations.decision, [...input.decisions])
            : undefined,
        ),
      )
      .orderBy(desc(eventEvaluations.evaluatedAt), desc(eventEvaluations.id))
      .limit(input.limit);
  }

  async listUsages(input: {
    earningRuleId: string;
    scopeKey?: string;
    effectiveAt?: string;
    limit: number;
  }): Promise<EarningRuleUsage[]> {
    return this.connection
      .select()
      .from(earningRuleUsages)
      .where(
        and(
          eq(earningRuleUsages.storeId, this.storeId),
          eq(earningRuleUsages.earningRuleId, input.earningRuleId),
          input.scopeKey ? eq(earningRuleUsages.scopeKey, input.scopeKey) : undefined,
          input.effectiveAt ? lte(earningRuleUsages.windowStartedAt, input.effectiveAt) : undefined,
          input.effectiveAt
            ? or(
                isNull(earningRuleUsages.windowEndedAt),
                gt(earningRuleUsages.windowEndedAt, input.effectiveAt),
              )
            : undefined,
        ),
      )
      .orderBy(desc(earningRuleUsages.windowStartedAt), desc(earningRuleUsages.id))
      .limit(input.limit);
  }

  async getEvaluationsByFactIds(ids: readonly string[]): Promise<EventEvaluation[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(eventEvaluations)
      .where(
        and(
          eq(eventEvaluations.storeId, this.storeId),
          inArray(eventEvaluations.eventFactId, [...ids]),
        ),
      )
      .orderBy(desc(eventEvaluations.evaluatedAt), desc(eventEvaluations.id));
  }

  async getCurrentUsages(
    earningRuleIds: readonly string[],
    scopeKeys: readonly string[],
    effectiveAt: string,
  ): Promise<EarningRuleUsage[]> {
    if (earningRuleIds.length === 0 || scopeKeys.length === 0) return [];
    return this.connection
      .select()
      .from(earningRuleUsages)
      .where(
        and(
          eq(earningRuleUsages.storeId, this.storeId),
          inArray(earningRuleUsages.earningRuleId, [...earningRuleIds]),
          inArray(earningRuleUsages.scopeKey, [...scopeKeys]),
          lte(earningRuleUsages.windowStartedAt, effectiveAt),
          or(
            isNull(earningRuleUsages.windowEndedAt),
            gt(earningRuleUsages.windowEndedAt, effectiveAt),
          ),
        ),
      )
      .orderBy(desc(earningRuleUsages.windowStartedAt), desc(earningRuleUsages.id));
  }

  async findFactById(id: string): Promise<EventFact | null> {
    const rows = await this.connection
      .select()
      .from(eventFacts)
      .where(and(eq(eventFacts.storeId, this.storeId), eq(eventFacts.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findFactByExternalId(producer: string, externalEventId: string): Promise<EventFact | null> {
    const rows = await this.connection
      .select()
      .from(eventFacts)
      .where(
        and(
          eq(eventFacts.storeId, this.storeId),
          eq(eventFacts.producer, producer),
          eq(eventFacts.externalEventId, externalEventId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async appendFact(input: Omit<NewEventFact, "storeId">): Promise<EventFact> {
    const rows = await this.connection
      .insert(eventFacts)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async listFactsForCustomer(customerId: string, limit = 100): Promise<EventFact[]> {
    return this.connection
      .select()
      .from(eventFacts)
      .where(and(eq(eventFacts.storeId, this.storeId), eq(eventFacts.customerId, customerId)))
      .orderBy(desc(eventFacts.occurredAt), desc(eventFacts.id))
      .limit(limit);
  }

  async listAllFactsForCustomer(customerId: string): Promise<EventFact[]> {
    return this.connection
      .select()
      .from(eventFacts)
      .where(and(eq(eventFacts.storeId, this.storeId), eq(eventFacts.customerId, customerId)))
      .orderBy(desc(eventFacts.occurredAt), desc(eventFacts.id));
  }

  async findOrderEligibilityFact(customerId: string, orderId: string): Promise<EventFact | null> {
    const rows = await this.connection
      .select()
      .from(eventFacts)
      .where(
        and(
          eq(eventFacts.storeId, this.storeId),
          eq(eventFacts.customerId, customerId),
          eq(eventFacts.eventType, "orderRewardEligible"),
          sql`${eventFacts.payload}->>'orderId' = ${orderId}`,
        ),
      )
      .orderBy(desc(eventFacts.occurredAt), desc(eventFacts.id))
      .limit(1);
    return rows[0] ?? null;
  }

  async listOrderEligibilityFacts(customerId: string, orderId: string): Promise<EventFact[]> {
    return this.connection
      .select()
      .from(eventFacts)
      .where(
        and(
          eq(eventFacts.storeId, this.storeId),
          eq(eventFacts.customerId, customerId),
          eq(eventFacts.eventType, "orderRewardEligible"),
          sql`${eventFacts.payload}->>'orderId' = ${orderId}`,
        ),
      )
      .orderBy(eventFacts.occurredAt, eventFacts.id);
  }

  async findEvaluation(
    eventFactId: string,
    earningRuleId: string,
    accountId: string,
  ): Promise<EventEvaluation | null> {
    const rows = await this.connection
      .select()
      .from(eventEvaluations)
      .where(
        and(
          eq(eventEvaluations.storeId, this.storeId),
          eq(eventEvaluations.eventFactId, eventFactId),
          eq(eventEvaluations.earningRuleId, earningRuleId),
          eq(eventEvaluations.accountId, accountId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async listEvaluations(eventFactId: string, accountId: string): Promise<EventEvaluation[]> {
    return this.connection
      .select()
      .from(eventEvaluations)
      .where(
        and(
          eq(eventEvaluations.storeId, this.storeId),
          eq(eventEvaluations.eventFactId, eventFactId),
          eq(eventEvaluations.accountId, accountId),
        ),
      )
      .orderBy(desc(eventEvaluations.evaluatedAt), desc(eventEvaluations.id));
  }

  async appendEvaluation(input: Omit<NewEventEvaluation, "storeId">): Promise<EventEvaluation> {
    const rows = await this.connection
      .insert(eventEvaluations)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async lockUsage(
    earningRuleId: string,
    scopeKey: string,
    windowStartedAt: string,
  ): Promise<EarningRuleUsage | null> {
    const rows = await this.connection
      .select()
      .from(earningRuleUsages)
      .where(
        and(
          eq(earningRuleUsages.storeId, this.storeId),
          eq(earningRuleUsages.earningRuleId, earningRuleId),
          eq(earningRuleUsages.scopeKey, scopeKey),
          eq(earningRuleUsages.windowStartedAt, windowStartedAt),
        ),
      )
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  async createUsage(input: Omit<NewEarningRuleUsage, "storeId">): Promise<EarningRuleUsage> {
    const rows = await this.connection
      .insert(earningRuleUsages)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async lockOrCreateUsage(input: Omit<NewEarningRuleUsage, "storeId">): Promise<EarningRuleUsage> {
    await this.connection
      .insert(earningRuleUsages)
      .values({ ...input, storeId: this.storeId })
      .onConflictDoNothing();
    const usage = await this.lockUsage(input.earningRuleId, input.scopeKey, input.windowStartedAt);
    if (!usage) throw new Error("Earning rule usage could not be locked");
    return usage;
  }

  async summarizeAwards(input: {
    earningRuleId: string;
    accountId: string;
    startsAt: string;
    endsAt: string;
  }): Promise<{
    occurrenceCount: bigint;
    pointsAwarded: bigint;
    monetaryAmounts: Record<string, string>;
  }> {
    const rows = await this.connection
      .select({
        pointsAwarded: eventEvaluations.pointsAwarded,
        monetaryAmountMinor: eventEvaluations.monetaryAmountMinor,
        currencyCode: eventEvaluations.currencyCode,
      })
      .from(eventEvaluations)
      .innerJoin(eventFacts, eq(eventFacts.id, eventEvaluations.eventFactId))
      .where(
        and(
          eq(eventEvaluations.storeId, this.storeId),
          eq(eventEvaluations.earningRuleId, input.earningRuleId),
          eq(eventEvaluations.accountId, input.accountId),
          eq(eventEvaluations.decision, "AWARDED"),
          gte(eventFacts.occurredAt, input.startsAt),
          lte(eventFacts.occurredAt, input.endsAt),
        ),
      );
    const monetaryAmounts: Record<string, string> = {};
    let pointsAwarded = 0n;
    for (const row of rows) {
      pointsAwarded += row.pointsAwarded ?? 0n;
      if (row.currencyCode && row.monetaryAmountMinor) {
        monetaryAmounts[row.currencyCode] = (
          BigInt(monetaryAmounts[row.currencyCode] ?? "0") + row.monetaryAmountMinor
        ).toString();
      }
    }
    return { occurrenceCount: BigInt(rows.length), pointsAwarded, monetaryAmounts };
  }

  async updateUsage(
    id: string,

    input: Partial<
      Pick<
        NewEarningRuleUsage,
        "windowEndedAt" | "occurrenceCount" | "pointsAwarded" | "monetaryAmounts"
      >
    >,
  ): Promise<EarningRuleUsage | null> {
    const rows = await this.connection
      .update(earningRuleUsages)
      .set({
        ...input,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(earningRuleUsages.storeId, this.storeId), eq(earningRuleUsages.id, id)))
      .returning();
    return rows[0] ?? null;
  }
}
