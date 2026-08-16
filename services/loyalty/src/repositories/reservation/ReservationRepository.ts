import { and, asc, eq, lte, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  reservationEvents,
  reservations,
  type NewReservation,
  type NewReservationEvent,
  type Reservation,
  type ReservationEvent,
} from "../models/index.js";

export class ReservationRepository extends BaseRepository {
  async findById(id: string): Promise<Reservation | null> {
    const rows = await this.connection
      .select()
      .from(reservations)
      .where(
        and(eq(reservations.storeId, this.storeId), eq(reservations.id, id)),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async lockById(id: string): Promise<Reservation | null> {
    const rows = await this.connection
      .select()
      .from(reservations)
      .where(
        and(eq(reservations.storeId, this.storeId), eq(reservations.id, id)),
      )
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<Reservation | null> {
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

  async findActiveForCheckout(
    accountId: string,
    checkoutId: string,
  ): Promise<Reservation | null> {
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

  async appendEvent(
    input: Omit<NewReservationEvent, "storeId">,
  ): Promise<ReservationEvent> {
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
