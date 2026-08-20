import type { OrderSaleCommittedEvent, OrderSaleReversedEvent } from "@shopana/events";
import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import { sha256Canonical } from "../../recommendation/canonical.js";
import { RecommendationIntegrityError } from "../../recommendation/errors.js";
import { uuidV7 } from "./validation.js";

export type RecommendationSaleEvent = OrderSaleCommittedEvent | OrderSaleReversedEvent;

export interface RecommendationOrderFactIngestResult {
  status: "inserted" | "duplicate";
  ingestionPosition: string;
}

export class RecommendationOrderFactIngestScript extends BaseScript<
  { event: RecommendationSaleEvent },
  RecommendationOrderFactIngestResult
> {
  @Transactional()
  protected async execute({
    event,
  }: {
    event: RecommendationSaleEvent;
  }): Promise<RecommendationOrderFactIngestResult> {
    const normalized = normalizeEvent(event, this.context.store.id);
    const cursor = await this.repository.recommendationIngestionCursor.lockOrCreate();
    const byEvent = await this.repository.recommendationOrderFact.findByEventId(event.eventId);
    const byRevision = await this.repository.recommendationOrderFact.findByOrderRevision(
      normalized.orderId,
      normalized.orderRevision,
    );
    const existing = byEvent ?? byRevision;
    if (existing) {
      if (existing.payloadHash === normalized.payloadHash) {
        return { status: "duplicate", ingestionPosition: existing.ingestionPosition.toString() };
      }
      throw new RecommendationIntegrityError(
        "EVENT_PAYLOAD_CONFLICT",
        "Sale event or order revision has conflicting payload",
      );
    }
    const committedAt = await this.repository.recommendationOrderFact.findGenerationCommittedAt(
      normalized.orderId,
    );
    if (committedAt !== null && Date.parse(committedAt) !== Date.parse(normalized.committedAt)) {
      throw new RecommendationIntegrityError(
        "EVENT_PAYLOAD_CONFLICT",
        "committedAt is immutable across order revisions",
      );
    }
    const ingestionPosition = cursor.lastPosition + 1n;
    await this.repository.recommendationOrderFact.insert({
      ...normalized,
      eventId: event.eventId,
      ingestionPosition,
    });
    await this.repository.recommendationIngestionCursor.advance(
      cursor.cursorId,
      cursor.lastPosition,
    );
    return { status: "inserted", ingestionPosition: ingestionPosition.toString() };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

function normalizeEvent(event: RecommendationSaleEvent, trustedStoreId: string) {
  if (
    !uuidV7.test(event.eventId) ||
    !uuidV7.test(event.payload.orderId) ||
    event.payload.storeId !== trustedStoreId ||
    event.payload.schemaVersion !== 1
  ) {
    invalid("Sale event identifiers or schemaVersion are invalid");
  }
  const revision = event.payload.orderRevision;
  if (!Number.isSafeInteger(revision) || revision < 1 || revision > 2_147_483_647)
    invalid("orderRevision is outside schemaVersion 1 bounds");
  const committedAt = requiredTimestamp(event.payload.committedAt, "committedAt");
  const effectiveOccurredAt =
    event.eventType === "orderSaleCommitted"
      ? requiredTimestamp(event.timestamp, "timestamp")
      : requiredTimestamp(event.payload.reversedAt, "reversedAt");
  if (Date.parse(effectiveOccurredAt) < Date.parse(committedAt))
    invalid("Sale occurrence cannot precede committedAt");
  const aggregated = new Map<string, number>();
  if (event.eventType === "orderSaleCommitted") {
    if (event.payload.lines.length < 1 || event.payload.lines.length > 100)
      invalid("Committed sale must contain from 1 to 100 lines");
    for (const line of event.payload.lines) {
      if (
        !uuidV7.test(line.productId) ||
        !Number.isSafeInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > 2_147_483_647
      )
        invalid("Committed sale line is invalid");
      const quantity = (aggregated.get(line.productId) ?? 0) + line.quantity;
      if (!Number.isSafeInteger(quantity) || quantity > 2_147_483_647)
        invalid("Aggregated product quantity exceeds schemaVersion 1 bounds");
      aggregated.set(line.productId, quantity);
    }
    if (aggregated.size > 100) invalid("Committed sale has too many distinct products");
  }
  const lines = [...aggregated]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([productId, quantity]) => ({ productId, quantity }));
  const canonicalPayload =
    event.eventType === "orderSaleCommitted" ? { ...event.payload, lines } : event.payload;
  return {
    orderId: event.payload.orderId,
    state:
      event.eventType === "orderSaleCommitted" ? ("COMMITTED" as const) : ("REVERSED" as const),
    orderRevision: revision,
    committedAt,
    occurredAt: effectiveOccurredAt,
    payloadHash: sha256Canonical({
      eventType: event.eventType,
      payload: canonicalPayload,
      effectiveOccurredAt,
    }),
    lines,
  };
}

function requiredTimestamp(value: string, field: string): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    invalid(`${field} must be RFC 3339`);
  return value;
}

function invalid(message: string): never {
  throw new RecommendationIntegrityError("INVALID_EVENT_PAYLOAD", message);
}
