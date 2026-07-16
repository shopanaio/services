import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  normalizeRelayPagination,
  type RepositoryConnectionResult,
} from "../connection.js";
import {
  decodeCustomerConsentEventGlobalId,
  decodeCustomerConsentGlobalId,
  decodeCustomerGlobalId,
} from "../global-id-where-mappers.js";
import {
  customerConsent,
  customerConsentEvent,
  type CustomerConsent,
  type CustomerConsentEvent,
  type NewCustomerConsent,
  type NewCustomerConsentEvent,
} from "../models/index.js";

export const customerConsentEventRelayQuery = createRelayQuery(
  createQuery(customerConsentEvent)
    .include(["id"])
    .mapWhereFields({
      id: decodeCustomerConsentEventGlobalId,
      customerId: decodeCustomerGlobalId,
      consentId: decodeCustomerConsentGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "customerConsentEvent", tieBreaker: "id" }
);

export type CustomerConsentEventRelayInput = InferRelayInput<
  typeof customerConsentEventRelayQuery
>;
export type CustomerConsentEventConnectionInput =
  CustomerConsentEventRelayInput & { consentId: string };

export interface CustomerConsentSetData {
  customerId: string;
  channel: CustomerConsent["channel"];
  state: CustomerConsent["state"];
  optInLevel?: CustomerConsent["optInLevel"];
  contactPoint: string;
  source?: string;
  sourceLocationId?: string | null;
  sourceIp?: string | null;
  userAgent?: string | null;
  actorType: string;
  actorId?: string | null;
  requestId?: string | null;
  idempotencyKey?: string | null;
  evidence?: Record<string, unknown>;
  occurredAt?: string;
  createOnly?: boolean;
}

export interface CustomerConsentSetResult {
  consent: CustomerConsent;
  event: CustomerConsentEvent;
}

export interface CustomerConsentUpdateData {
  id: string;
  customerId: string;
  channel: CustomerConsent["channel"];
  state: CustomerConsent["state"];
  optInLevel: CustomerConsent["optInLevel"];
  contactPoint: string;
  source?: string;
  sourceLocationId?: string | null;
  actorType: string;
  actorId?: string | null;
  requestId?: string | null;
  idempotencyKey?: string | null;
  evidence?: Record<string, unknown>;
}

export interface CustomerConsentUpdateResult extends CustomerConsentSetResult {
  previousCustomerId: string;
}

export interface CustomerConsentDeleteResult {
  id: string;
  customerId: string;
}

export class CustomerConsentAlreadyExistsError extends Error {
  constructor() {
    super("A consent record already exists for this customer and channel");
    this.name = "CustomerConsentAlreadyExistsError";
  }
}

export class CustomerConsentRepository extends BaseRepository {
  @ReadOnly()
  async findById(id: string): Promise<CustomerConsent | null> {
    const rows = await this.connection
      .select()
      .from(customerConsent)
      .where(
        and(
          eq(customerConsent.storeId, this.storeId),
          eq(customerConsent.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findByCustomerAndChannel(
    customerId: string,
    channel: CustomerConsent["channel"]
  ): Promise<CustomerConsent | null> {
    const rows = await this.connection
      .select()
      .from(customerConsent)
      .where(
        and(
          eq(customerConsent.storeId, this.storeId),
          eq(customerConsent.customerId, customerId),
          eq(customerConsent.channel, channel)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async hasEvents(consentId: string): Promise<boolean> {
    const rows = await this.connection
      .select({ id: customerConsentEvent.id })
      .from(customerConsentEvent)
      .where(
        and(
          eq(customerConsentEvent.storeId, this.storeId),
          eq(customerConsentEvent.consentId, consentId)
        )
      )
      .limit(1);
    return rows.length > 0;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<CustomerConsent[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(customerConsent)
      .where(
        and(
          eq(customerConsent.storeId, this.storeId),
          inArray(customerConsent.id, [...new Set(ids)])
        )
      );
  }

  @ReadOnly()
  async getByCustomerIds(customerIds: readonly string[]): Promise<CustomerConsent[]> {
    if (customerIds.length === 0) return [];
    return this.connection
      .select()
      .from(customerConsent)
      .where(
        and(
          eq(customerConsent.storeId, this.storeId),
          inArray(customerConsent.customerId, [...new Set(customerIds)])
        )
      );
  }

  @ReadOnly()
  async findEventById(id: string): Promise<CustomerConsentEvent | null> {
    const rows = await this.connection
      .select()
      .from(customerConsentEvent)
      .where(
        and(
          eq(customerConsentEvent.storeId, this.storeId),
          eq(customerConsentEvent.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getEventsByIds(ids: readonly string[]): Promise<CustomerConsentEvent[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(customerConsentEvent)
      .where(
        and(
          eq(customerConsentEvent.storeId, this.storeId),
          inArray(customerConsentEvent.id, [...new Set(ids)])
        )
      );
  }

  @Transactional()
  async set(data: CustomerConsentSetData): Promise<CustomerConsentSetResult> {
    if (data.idempotencyKey) {
      const existingEvent = await this.findEventByIdempotencyKey(
        data.idempotencyKey
      );
      if (existingEvent) {
        const consent = await this.findById(existingEvent.consentId);
        if (!consent) {
          throw new Error("Consent event references a missing consent record");
        }
        return { consent, event: existingEvent };
      }
    }

    const current = await this.findByCustomerAndChannel(
      data.customerId,
      data.channel
    );
    if (current && data.createOnly) {
      throw new CustomerConsentAlreadyExistsError();
    }
    const now = data.occurredAt ?? new Date().toISOString();
    const timestamps = consentTimestamps(data.state, current, now);
    const consentRow: NewCustomerConsent = {
      id: current?.id ?? (await this.generateUuidV7()),
      storeId: this.storeId,
      customerId: data.customerId,
      channel: data.channel,
      state: data.state,
      optInLevel: data.optInLevel ?? "UNKNOWN",
      contactPoint: data.contactPoint.trim(),
      source: data.source ?? "admin",
      sourceLocationId: data.sourceLocationId ?? null,
      sourceIp: data.sourceIp ?? null,
      userAgent: data.userAgent ?? null,
      consentedAt: timestamps.consentedAt,
      withdrawnAt: timestamps.withdrawnAt,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
    const consentRows = current
      ? await this.connection
        .update(customerConsent)
        .set({
          state: consentRow.state,
          optInLevel: consentRow.optInLevel,
          contactPoint: consentRow.contactPoint,
          source: consentRow.source,
          sourceLocationId: consentRow.sourceLocationId,
          sourceIp: consentRow.sourceIp,
          userAgent: consentRow.userAgent,
          consentedAt: consentRow.consentedAt,
          withdrawnAt: consentRow.withdrawnAt,
          updatedAt: now,
        })
        .where(
          and(
            eq(customerConsent.storeId, this.storeId),
            eq(customerConsent.id, current.id)
          )
        )
        .returning()
      : await this.connection
        .insert(customerConsent)
        .values(consentRow)
        .returning();
    const consent = consentRows[0];

    const eventRow: NewCustomerConsentEvent = {
      id: await this.generateUuidV7(),
      storeId: this.storeId,
      customerId: data.customerId,
      consentId: consent.id,
      channel: data.channel,
      previousState: current?.state ?? null,
      newState: data.state,
      optInLevel: data.optInLevel ?? "UNKNOWN",
      contactPoint: data.contactPoint.trim(),
      source: data.source ?? "admin",
      sourceLocationId: data.sourceLocationId ?? null,
      sourceIp: data.sourceIp ?? null,
      userAgent: data.userAgent ?? null,
      actorType: data.actorType,
      actorId: data.actorId ?? null,
      requestId: data.requestId ?? null,
      idempotencyKey: data.idempotencyKey ?? null,
      evidence: data.evidence ?? {},
      occurredAt: now,
    };
    const eventRows = await this.connection
      .insert(customerConsentEvent)
      .values(eventRow)
      .returning();
    return { consent, event: eventRows[0] };
  }

  @Transactional()
  async update(
    data: CustomerConsentUpdateData
  ): Promise<CustomerConsentUpdateResult | null> {
    if (data.idempotencyKey) {
      const existingEvent = await this.findEventByIdempotencyKey(
        data.idempotencyKey
      );
      if (existingEvent) {
        const consent = await this.findById(existingEvent.consentId);
        if (!consent) {
          throw new Error("Consent event references a missing consent record");
        }
        return {
          consent,
          event: existingEvent,
          previousCustomerId: consent.customerId,
        };
      }
    }

    const current = await this.findById(data.id);
    if (!current) return null;

    const now = new Date().toISOString();
    const timestamps = consentTimestamps(data.state, current, now);
    const consentRows = await this.connection
      .update(customerConsent)
      .set({
        customerId: data.customerId,
        channel: data.channel,
        state: data.state,
        optInLevel: data.optInLevel,
        contactPoint: data.contactPoint.trim(),
        source: data.source ?? "admin",
        sourceLocationId: data.sourceLocationId ?? null,
        consentedAt: timestamps.consentedAt,
        withdrawnAt: timestamps.withdrawnAt,
        updatedAt: now,
      })
      .where(
        and(
          eq(customerConsent.storeId, this.storeId),
          eq(customerConsent.id, data.id)
        )
      )
      .returning();
    const consent = consentRows[0];
    if (!consent) return null;

    const eventRows = await this.connection
      .insert(customerConsentEvent)
      .values({
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        customerId: data.customerId,
        consentId: consent.id,
        channel: data.channel,
        previousState: current.state,
        newState: data.state,
        optInLevel: data.optInLevel,
        contactPoint: data.contactPoint.trim(),
        source: data.source ?? "admin",
        sourceLocationId: data.sourceLocationId ?? null,
        sourceIp: null,
        userAgent: null,
        actorType: data.actorType,
        actorId: data.actorId ?? null,
        requestId: data.requestId ?? null,
        idempotencyKey: data.idempotencyKey ?? null,
        evidence: data.evidence ?? {},
        occurredAt: now,
      })
      .returning();

    return {
      consent,
      event: eventRows[0],
      previousCustomerId: current.customerId,
    };
  }

  @Transactional()
  async delete(id: string): Promise<CustomerConsentDeleteResult | null> {
    const rows = await this.connection
      .delete(customerConsent)
      .where(
        and(
          eq(customerConsent.storeId, this.storeId),
          eq(customerConsent.id, id)
        )
      )
      .returning({
        id: customerConsent.id,
        customerId: customerConsent.customerId,
      });
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getEventConnection(
    input: CustomerConsentEventConnectionInput
  ): Promise<RepositoryConnectionResult> {
    const normalized = normalizeRelayPagination(input);
    const { consentId, where, orderBy, ...pagination } = normalized;
    const mergedWhere: CustomerConsentEventRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { consentId: { _eq: consentId } },
        ...(where ? [where] : []),
      ],
    };
    const effectiveOrder = orderBy ?? [
      { field: "occurredAt", direction: "desc" },
    ];
    const query: CustomerConsentEventRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: effectiveOrder,
      filters: {
        storeId: this.storeId,
        consentId,
        where: where ?? null,
        orderBy: effectiveOrder,
      },
    };
    const [result, totalCount] = await Promise.all([
      customerConsentEventRelayQuery.execute(this.connection, query),
      customerConsentEventRelayQuery.count(this.connection, {
        where: mergedWhere,
      }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  private async findEventByIdempotencyKey(
    idempotencyKey: string
  ): Promise<CustomerConsentEvent | null> {
    const rows = await this.connection
      .select()
      .from(customerConsentEvent)
      .where(
        and(
          eq(customerConsentEvent.storeId, this.storeId),
          eq(customerConsentEvent.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }
}

function consentTimestamps(
  state: CustomerConsent["state"],
  current: CustomerConsent | null,
  now: string
): Pick<CustomerConsent, "consentedAt" | "withdrawnAt"> {
  if (state === "SUBSCRIBED") {
    return { consentedAt: now, withdrawnAt: null };
  }
  if (state === "UNSUBSCRIBED") {
    return { consentedAt: current?.consentedAt ?? null, withdrawnAt: now };
  }
  return { consentedAt: null, withdrawnAt: null };
}
