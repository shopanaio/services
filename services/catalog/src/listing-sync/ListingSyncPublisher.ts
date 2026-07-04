import { Listing } from "@shopana/broker-types";
import type { DomainEvent } from "@shopana/events";
import { hashContent, type ServiceBroker } from "@shopana/shared-kernel";

export interface ListingSyncEventMetaInput {
  event: DomainEvent;
  projectId: string;
  operation: "sync" | "delete";
  itemRef?: Listing.ListingSellableItemRef;
}

export class ListingSyncPublisher {
  constructor(private readonly broker: ServiceBroker) {}

  async syncItem(input: {
    event: DomainEvent;
    projectId: string;
    item: Listing.ListingSellableItemSnapshot;
  }): Promise<Listing.SyncSellableItemResult> {
    return this.broker.call<
      Listing.SyncSellableItemResult,
      Listing.SyncSellableItemParams
    >("listing.syncSellableItem", {
      meta: this.buildMeta({
        event: input.event,
        projectId: input.projectId,
        operation: "sync",
        itemRef: input.item,
      }),
      projectId: input.projectId,
      item: input.item,
    });
  }

  async syncItems(input: {
    events: readonly DomainEvent[];
    projectId: string;
    items: Listing.ListingSellableItemSnapshot[];
  }): Promise<Listing.SyncSellableItemsResult> {
    const firstEvent = input.events[0];
    if (!firstEvent) {
      return { operationId: "empty", status: "completed", results: [] };
    }

    return this.broker.call<
      Listing.SyncSellableItemsResult,
      Listing.SyncSellableItemsParams
    >("listing.syncSellableItems", {
      meta: this.buildBatchMeta({
        events: input.events,
        firstEvent,
        projectId: input.projectId,
        operation: "sync",
      }),
      projectId: input.projectId,
      items: input.items,
    });
  }

  async deleteItem(input: {
    event: DomainEvent;
    projectId: string;
    itemRef: Listing.ListingSellableItemRef;
    sourceRevision: number;
    deletedAt: string;
    reason?: Listing.DeleteSellableItemParams["reason"];
  }): Promise<Listing.DeleteSellableItemResult> {
    return this.broker.call<
      Listing.DeleteSellableItemResult,
      Listing.DeleteSellableItemParams
    >("listing.deleteSellableItem", {
      meta: this.buildMeta({
        event: input.event,
        projectId: input.projectId,
        operation: "delete",
        itemRef: input.itemRef,
      }),
      projectId: input.projectId,
      itemRef: input.itemRef,
      sourceRevision: input.sourceRevision,
      deletedAt: input.deletedAt,
      reason: input.reason,
    });
  }

  buildMeta(input: ListingSyncEventMetaInput): Listing.ListingUpdateMeta {
    const subject = input.itemRef
      ? `${input.itemRef.entityType}:${input.itemRef.id}`
      : `${input.event.subject.type}:${input.event.subject.id}`;

    return {
      contractVersion: Listing.LISTING_UPDATE_CONTRACT_VERSION,
      operationId: input.event.eventId,
      idempotencyKey: hashContent({
        v: 1,
        service: "catalog",
        projectId: input.projectId,
        eventId: input.event.eventId,
        eventType: input.event.eventType,
        operation: input.operation,
        subject,
      }),
      occurredAt: input.event.timestamp,
      source: {
        service: "catalog",
        actor: mapActor(input.event),
        requestId: input.event.context.correlationId,
        workflowId: input.event.parentWorkflowId,
      },
    };
  }

  buildBatchMeta(input: {
    events: readonly DomainEvent[];
    firstEvent: DomainEvent;
    projectId: string;
    operation: "sync" | "delete";
  }): Listing.ListingUpdateMeta {
    const eventIds = input.events.map((event) => event.eventId).sort();

    return {
      contractVersion: Listing.LISTING_UPDATE_CONTRACT_VERSION,
      operationId: hashContent({
        v: 1,
        kind: "listing-batch-operation",
        eventIds,
      }),
      idempotencyKey: hashContent({
        v: 1,
        service: "catalog",
        projectId: input.projectId,
        eventType: input.firstEvent.eventType,
        operation: input.operation,
        eventIds,
      }),
      occurredAt: latestTimestamp(input.events),
      source: {
        service: "catalog",
        actor: mapActor(input.firstEvent),
        requestId: input.firstEvent.context.correlationId,
        workflowId: input.firstEvent.parentWorkflowId,
      },
    };
  }
}

export function listingSourceRevisionFromEvent(event: DomainEvent): number {
  const parsed = Date.parse(event.timestamp);
  const millis = Number.isFinite(parsed) ? parsed : Date.now();

  return millis * 1000 + stableRevisionSuffix(event.eventId);
}

export function listingSourceRevisionFromEvents(
  events: readonly DomainEvent[]
): number {
  return events.reduce(
    (max, event) => Math.max(max, listingSourceRevisionFromEvent(event)),
    0
  );
}

function latestTimestamp(events: readonly DomainEvent[]): string {
  const latest = events.reduce<string | null>((current, event) => {
    if (!current) return event.timestamp;
    return Date.parse(event.timestamp) > Date.parse(current)
      ? event.timestamp
      : current;
  }, null);

  return latest ?? new Date().toISOString();
}

function mapActor(
  event: DomainEvent
): Listing.ListingUpdateSource["actor"] | undefined {
  if (event.actor?.type === "user") {
    return "admin";
  }
  if (event.actor?.type === "service") {
    return "api";
  }
  if (event.actor?.type === "system") {
    return "system";
  }

  return undefined;
}

function stableRevisionSuffix(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1000;
  }
  return hash;
}
