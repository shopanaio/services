import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import {
  reservationEvents,
  reservations,
  type NewReservation,
  type NewReservationEvent,
  type Reservation,
  type ReservationEvent,
} from "../models/index.js";

const reservationRelayQuery = createRelayQuery(
  createQuery(reservations).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "loyalty-reservation", tieBreaker: "id" },
);

type ReservationRelayInput = InferRelayInput<typeof reservationRelayQuery>;

export interface ReservationConnectionInput {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  where?: {
    ids?: readonly string[];
    accountIds?: readonly string[];
    programIds?: readonly string[];
    checkoutId?: string;
    orderId?: string;
    statuses?: readonly Reservation["status"][];
    expiresBefore?: string;
    createdFrom?: string;
    createdTo?: string;
  };
}

export interface ReservationConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class ReservationRepository extends BaseRepository {
  async getByIds(ids: readonly string[]): Promise<Reservation[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(reservations)
      .where(and(eq(reservations.storeId, this.storeId), inArray(reservations.id, [...ids])));
  }

  async getEventsByIds(ids: readonly string[]): Promise<ReservationEvent[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(reservationEvents)
      .where(
        and(eq(reservationEvents.storeId, this.storeId), inArray(reservationEvents.id, [...ids])),
      );
  }

  async getEventsByReservationIds(reservationIds: readonly string[]): Promise<ReservationEvent[]> {
    if (reservationIds.length === 0) return [];
    return this.connection
      .select()
      .from(reservationEvents)
      .where(
        and(
          eq(reservationEvents.storeId, this.storeId),
          inArray(reservationEvents.reservationId, [...reservationIds]),
        ),
      )
      .orderBy(asc(reservationEvents.occurredAt), asc(reservationEvents.id));
  }

  async getConnection(input: ReservationConnectionInput): Promise<ReservationConnectionResult> {
    const { where, ...pagination } = input;
    const clauses: NonNullable<ReservationRelayInput["where"]>[] = [
      { storeId: { _eq: this.storeId } },
    ];
    if (where?.ids?.length) clauses.push({ id: { _in: [...where.ids] } });
    if (where?.accountIds?.length) clauses.push({ accountId: { _in: [...where.accountIds] } });
    if (where?.programIds?.length) clauses.push({ programId: { _in: [...where.programIds] } });
    if (where?.checkoutId) clauses.push({ checkoutId: { _eq: where.checkoutId } });
    if (where?.orderId) clauses.push({ orderId: { _eq: where.orderId } });
    if (where?.statuses?.length) clauses.push({ status: { _in: [...where.statuses] } });
    if (where?.expiresBefore) clauses.push({ expiresAt: { _lte: where.expiresBefore } });
    if (where?.createdFrom) clauses.push({ createdAt: { _gte: where.createdFrom } });
    if (where?.createdTo) clauses.push({ createdAt: { _lte: where.createdTo } });
    const relayInput: ReservationRelayInput = {
      ...pagination,
      where: { _and: clauses },
      orderBy: [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      reservationRelayQuery.execute(this.connection, relayInput),
      reservationRelayQuery.count(this.connection, { where: relayInput.where }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }
  async findById(id: string): Promise<Reservation | null> {
    const rows = await this.connection
      .select()
      .from(reservations)
      .where(and(eq(reservations.storeId, this.storeId), eq(reservations.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async lockById(id: string): Promise<Reservation | null> {
    const rows = await this.connection
      .select()
      .from(reservations)
      .where(and(eq(reservations.storeId, this.storeId), eq(reservations.id, id)))
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Reservation | null> {
    const rows = await this.connection
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.storeId, this.storeId),
          eq(reservations.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findActiveForCheckout(accountId: string, checkoutId: string): Promise<Reservation | null> {
    const rows = await this.connection
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.storeId, this.storeId),
          eq(reservations.accountId, accountId),
          eq(reservations.checkoutId, checkoutId),
          eq(reservations.status, "ACTIVE"),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findByOrder(orderId: string): Promise<Reservation[]> {
    return this.connection
      .select()
      .from(reservations)
      .where(and(eq(reservations.storeId, this.storeId), eq(reservations.orderId, orderId)))
      .orderBy(asc(reservations.createdAt), asc(reservations.id));
  }

  async listExpiredCandidates(now: string, limit = 100): Promise<Reservation[]> {
    return this.connection
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.storeId, this.storeId),
          eq(reservations.status, "ACTIVE"),
          lte(reservations.expiresAt, now),
        ),
      )
      .orderBy(asc(reservations.expiresAt), asc(reservations.id))
      .limit(limit)
      .for("update", { skipLocked: true });
  }

  async create(input: Omit<NewReservation, "storeId">): Promise<Reservation> {
    const rows = await this.connection
      .insert(reservations)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async updateState(
    id: string,
    expectedRevision: number,
    input: Partial<
      Pick<
        NewReservation,
        | "status"
        | "orderId"
        | "orderRevision"
        | "committedAt"
        | "releasedAt"
        | "expiredAt"
        | "reversedAt"
      >
    >,
  ): Promise<Reservation | null> {
    const rows = await this.connection
      .update(reservations)
      .set({
        ...input,
        revision: sql`${reservations.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(reservations.storeId, this.storeId),
          eq(reservations.id, id),
          eq(reservations.revision, expectedRevision),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async appendEvent(input: Omit<NewReservationEvent, "storeId">): Promise<ReservationEvent> {
    const rows = await this.connection
      .insert(reservationEvents)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async listEvents(reservationId: string): Promise<ReservationEvent[]> {
    return this.connection
      .select()
      .from(reservationEvents)
      .where(
        and(
          eq(reservationEvents.storeId, this.storeId),
          eq(reservationEvents.reservationId, reservationId),
        ),
      )
      .orderBy(asc(reservationEvents.occurredAt), asc(reservationEvents.id));
  }
}
