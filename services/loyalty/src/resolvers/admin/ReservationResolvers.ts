import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { Reservation, ReservationEvent } from "../../repositories/models/index.js";
import { LoyaltyType } from "./LoyaltyType.js";

@SubgraphReference()
export class LoyaltyReservationResolver extends LoyaltyType<string, Reservation> {
  async $preload() {
    const row = await this.$ctx.loaders.reservation.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty reservation ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyReservation);
  }
  async account() {
    return this.resolvers.account((await this.$get("accountId"))!);
  }
  async program() {
    return this.resolvers.program((await this.$get("programId"))!);
  }
  async programVersion() {
    return this.resolvers.programVersion((await this.$get("programVersionId"))!);
  }
  async checkoutId() {
    return this.encodeId((await this.$get("checkoutId"))!, GlobalIdEntity.Checkout);
  }
  checkoutVersion() {
    return this.$get("checkoutVersion");
  }
  quoteId() {
    return this.$get("quoteId");
  }
  quoteRevision() {
    return this.$get("quoteRevision");
  }
  async points() {
    return String(await this.$get("points"));
  }
  async discount() {
    return {
      amountMinor: String(await this.$get("discountAmountMinor")),
      currencyCode: await this.$get("currencyCode"),
    };
  }
  status() {
    return this.$get("status");
  }
  idempotencyKey() {
    return this.$get("idempotencyKey");
  }
  requestHash() {
    return this.$get("requestHash");
  }
  expiresAt() {
    return this.$get("expiresAt");
  }
  async orderId() {
    const id = await this.$get("orderId");
    return id ? this.encodeId(id, GlobalIdEntity.Order) : null;
  }
  orderRevision() {
    return this.$get("orderRevision");
  }
  committedAt() {
    return this.$get("committedAt");
  }
  releasedAt() {
    return this.$get("releasedAt");
  }
  expiredAt() {
    return this.$get("expiredAt");
  }
  reversedAt() {
    return this.$get("reversedAt");
  }
  revision() {
    return this.$get("revision");
  }
  async events() {
    return Promise.all(
      (await this.$ctx.loaders.reservationEvents.load(this.$props)).map(({ id }) =>
        this.resolvers.reservationEvent(id),
      ),
    );
  }
  createdAt() {
    return this.$get("createdAt");
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
}

@SubgraphReference()
export class LoyaltyReservationEventResolver extends LoyaltyType<string, ReservationEvent> {
  async $preload() {
    const row = await this.$ctx.loaders.reservationEvent.load(this.$props);
    if (!row)
      throw new PreloadNotFoundError(`Loyalty reservation event ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyReservationEvent);
  }
  async reservation() {
    return this.resolvers.reservation((await this.$get("reservationId"))!);
  }
  eventType() {
    return this.$get("eventType");
  }
  previousStatus() {
    return this.$get("previousStatus");
  }
  status() {
    return this.$get("status");
  }
  async transaction() {
    return this.resolvers.transaction((await this.$get("transactionId"))!);
  }
  eventId() {
    return this.$get("eventId");
  }
  idempotencyKey() {
    return this.$get("idempotencyKey");
  }
  reasonCode() {
    return this.$get("reasonCode");
  }
  actorType() {
    return this.$get("actorType");
  }
  async actorId() {
    const id = await this.$get("actorId");
    if (!id) return null;
    return this.encodeId(
      id,
      (await this.$get("actorType")) === "CUSTOMER" ? GlobalIdEntity.Customer : GlobalIdEntity.User,
    );
  }
  occurredAt() {
    return this.$get("occurredAt");
  }
  metadata() {
    return this.$get("metadata");
  }
  createdAt() {
    return this.$get("createdAt");
  }
}
