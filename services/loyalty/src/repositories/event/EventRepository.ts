import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
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
  async findFactById(id: string): Promise<EventFact | null> {
    const rows = await this.connection
      .select()
      .from(eventFacts)
      .where(and(eq(eventFacts.storeId, this.storeId), eq(eventFacts.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findFactByExternalId(
    producer: string,
    externalEventId: string,
  ): Promise<EventFact | null> {
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

  async listFactsForCustomer(
    customerId: string,
    limit = 100,
  ): Promise<EventFact[]> {
    return this.connection
      .select()
      .from(eventFacts)
      .where(
        and(
          eq(eventFacts.storeId, this.storeId),
          eq(eventFacts.customerId, customerId),
        ),
      )
      .orderBy(desc(eventFacts.occurredAt), desc(eventFacts.id))
      .limit(limit);
  }

  async listAllFactsForCustomer(customerId: string): Promise<EventFact[]> {
    return this.connection
      .select()
      .from(eventFacts)
      .where(and(
        eq(eventFacts.storeId, this.storeId),
        eq(eventFacts.customerId, customerId),
      ))
      .orderBy(desc(eventFacts.occurredAt), desc(eventFacts.id));
  }

  async findOrderEligibilityFact(
    customerId: string,
    orderId: string,
  ): Promise<EventFact | null> {
    const rows = await this.connection
      .select()
      .from(eventFacts)
      .where(and(
        eq(eventFacts.storeId, this.storeId),
        eq(eventFacts.customerId, customerId),
        eq(eventFacts.eventType, "orderRewardEligible"),
        sql`${eventFacts.payload}->>'orderId' = ${orderId}`,
      ))
      .orderBy(desc(eventFacts.occurredAt), desc(eventFacts.id))
      .limit(1);
    return rows[0] ?? null;
  }

  async listOrderEligibilityFacts(
    customerId: string,
    orderId: string,
  ): Promise<EventFact[]> {
    return this.connection
      .select()
      .from(eventFacts)
      .where(and(
        eq(eventFacts.storeId, this.storeId),
        eq(eventFacts.customerId, customerId),
        eq(eventFacts.eventType, "orderRewardEligible"),
        sql`${eventFacts.payload}->>'orderId' = ${orderId}`,
      ))
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

  async listEvaluations(
    eventFactId: string,
    accountId: string,
  ): Promise<EventEvaluation[]> {
    return this.connection
      .select()
      .from(eventEvaluations)
      .where(and(
        eq(eventEvaluations.storeId, this.storeId),
        eq(eventEvaluations.eventFactId, eventFactId),
        eq(eventEvaluations.accountId, accountId),
      ))
      .orderBy(desc(eventEvaluations.evaluatedAt), desc(eventEvaluations.id));
  }

  async appendEvaluation(
    input: Omit<NewEventEvaluation, "storeId">,
  ): Promise<EventEvaluation> {
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

  async createUsage(
    input: Omit<NewEarningRuleUsage, "storeId">,
  ): Promise<EarningRuleUsage> {
    const rows = await this.connection
      .insert(earningRuleUsages)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async lockOrCreateUsage(
    input: Omit<NewEarningRuleUsage, "storeId">,
  ): Promise<EarningRuleUsage> {
    await this.connection
      .insert(earningRuleUsages)
      .values({ ...input, storeId: this.storeId })
      .onConflictDoNothing();
    const usage = await this.lockUsage(
      input.earningRuleId,
      input.scopeKey,
      input.windowStartedAt,
    );
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
      .where(and(
        eq(eventEvaluations.storeId, this.storeId),
        eq(eventEvaluations.earningRuleId, input.earningRuleId),
        eq(eventEvaluations.accountId, input.accountId),
        eq(eventEvaluations.decision, "AWARDED"),
        gte(eventFacts.occurredAt, input.startsAt),
        lte(eventFacts.occurredAt, input.endsAt),
      ));
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
    expectedRevision: number,
    input: Partial<
      Pick<
        NewEarningRuleUsage,
        | "windowEndedAt"
        | "occurrenceCount"
        | "pointsAwarded"
        | "monetaryAmounts"
      >
    >,
  ): Promise<EarningRuleUsage | null> {
    const rows = await this.connection
      .update(earningRuleUsages)
      .set({
        ...input,
        revision: sql`${earningRuleUsages.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(earningRuleUsages.storeId, this.storeId),
          eq(earningRuleUsages.id, id),
          eq(earningRuleUsages.revision, expectedRevision),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }
}
