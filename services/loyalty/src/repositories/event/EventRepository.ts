import { and, desc, eq, sql } from "drizzle-orm";
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
