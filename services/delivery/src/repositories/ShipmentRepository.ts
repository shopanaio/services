import { and, asc, eq, isNull } from "drizzle-orm";
import type { Delivery } from "@shopana/broker-types";
import type {
  DeliveryAtomicMutationRecord,
  DeliveryAtomicMutationResult,
  DeliveryShipmentsPort,
  DeliveryUnitOfWorkPort,
} from "../contracts/ports.js";
import { BaseRepository } from "./BaseRepository.js";
import {
  deliveryMutations,
  deliveryOutbox,
  providerInbox,
  shipmentOperations,
  shipmentTrackingEvents,
  shipments,
} from "./models/index.js";

export class ShipmentRepository
  extends BaseRepository
  implements DeliveryShipmentsPort, DeliveryUnitOfWorkPort
{
  async get(storeId: string, shipmentId: string) {
    const [row] = await this.connection
      .select({ snapshot: shipments.snapshot })
      .from(shipments)
      .where(and(eq(shipments.storeId, storeId), eq(shipments.id, shipmentId)))
      .limit(1);
    return row?.snapshot ?? null;
  }

  async findByProviderReference(
    storeId: string,
    providerAccountId: string,
    providerShipmentReference: string,
  ) {
    const [row] = await this.connection
      .select({ snapshot: shipments.snapshot })
      .from(shipments)
      .where(
        and(
          eq(shipments.storeId, storeId),
          eq(shipments.providerAccountId, providerAccountId),
          eq(shipments.providerShipmentReference, providerShipmentReference),
        ),
      )
      .limit(1);
    return row?.snapshot ?? null;
  }

  async listOperations(storeId: string, shipmentId: string) {
    const rows = await this.connection
      .select({ snapshot: shipmentOperations.snapshot })
      .from(shipmentOperations)
      .where(
        and(eq(shipmentOperations.storeId, storeId), eq(shipmentOperations.shipmentId, shipmentId)),
      )
      .orderBy(asc(shipmentOperations.createdAt));
    return rows.map(({ snapshot }) => snapshot);
  }

  async listTrackingEvents(storeId: string, shipmentId: string) {
    const rows = await this.connection
      .select({ snapshot: shipmentTrackingEvents.snapshot })
      .from(shipmentTrackingEvents)
      .where(
        and(
          eq(shipmentTrackingEvents.storeId, storeId),
          eq(shipmentTrackingEvents.shipmentId, shipmentId),
        ),
      )
      .orderBy(asc(shipmentTrackingEvents.occurredAt));
    return rows.map(({ snapshot }) => snapshot);
  }

  async findOperationByIdempotency(
    storeId: string,
    scope: string,
    key: string,
  ): Promise<Delivery.DeliveryShipmentOperationSnapshot | null> {
    const [row] = await this.connection
      .select({ snapshot: shipmentOperations.snapshot })
      .from(shipmentOperations)
      .where(
        and(
          eq(shipmentOperations.storeId, storeId),
          eq(shipmentOperations.idempotencyScope, scope),
          eq(shipmentOperations.idempotencyKey, key),
        ),
      )
      .limit(1);
    return row?.snapshot ?? null;
  }

  async listPendingOutbox(storeId: string, shipmentId: string) {
    return this.connection
      .select({ id: deliveryOutbox.id, event: deliveryOutbox.event })
      .from(deliveryOutbox)
      .where(
        and(
          eq(deliveryOutbox.storeId, storeId),
          eq(deliveryOutbox.shipmentId, shipmentId),
          isNull(deliveryOutbox.emittedAt),
        ),
      )
      .orderBy(asc(deliveryOutbox.createdAt));
  }

  async markOutboxEmitted(id: string, emittedAt: string): Promise<void> {
    await this.connection
      .update(deliveryOutbox)
      .set({ emittedAt })
      .where(and(eq(deliveryOutbox.id, id), isNull(deliveryOutbox.emittedAt)));
  }

  async commit(record: DeliveryAtomicMutationRecord): Promise<DeliveryAtomicMutationResult> {
    return this.txManager.run(async () => {
      const [priorMutation] = await this.connection
        .select()
        .from(deliveryMutations)
        .where(
          and(
            eq(deliveryMutations.storeId, record.storeId),
            eq(deliveryMutations.idempotencyScope, record.idempotency.scope),
            eq(deliveryMutations.idempotencyKey, record.idempotency.key),
          ),
        )
        .limit(1)
        .for("update");
      if (priorMutation) {
        return priorMutation.requestHash === record.idempotency.requestHash
          ? { status: "DUPLICATE", shipmentRevision: priorMutation.shipmentRevision }
          : { status: "IDEMPOTENCY_CONFLICT", shipmentRevision: priorMutation.shipmentRevision };
      }

      if (record.providerInbox) {
        const [inbox] = await this.connection
          .select()
          .from(providerInbox)
          .where(
            and(
              eq(providerInbox.storeId, record.providerInbox.storeId),
              eq(providerInbox.providerAccountId, record.providerInbox.providerAccountId),
              eq(providerInbox.providerEventId, record.providerInbox.providerEventId),
            ),
          )
          .limit(1)
          .for("update");
        if (inbox) {
          return inbox.eventHash === record.providerInbox.eventHash
            ? {
                status: "DUPLICATE",
                shipmentRevision: record.expectedShipmentRevision ?? record.shipment.revision,
              }
            : {
                status: "IDEMPOTENCY_CONFLICT",
                shipmentRevision: record.expectedShipmentRevision ?? record.shipment.revision,
              };
        }
      }

      const [current] = await this.connection
        .select()
        .from(shipments)
        .where(
          and(eq(shipments.storeId, record.storeId), eq(shipments.id, record.shipment.shipmentId)),
        )
        .limit(1)
        .for("update");
      if (
        record.expectedShipmentRevision === null
          ? Boolean(current)
          : current?.revision !== record.expectedShipmentRevision
      ) {
        return { status: "REVISION_CONFLICT", shipmentRevision: current?.revision ?? 0 };
      }

      const values = shipmentValues(record.shipment);
      if (current) {
        await this.connection
          .update(shipments)
          .set(values)
          .where(
            and(
              eq(shipments.storeId, record.storeId),
              eq(shipments.id, record.shipment.shipmentId),
            ),
          );
      } else {
        await this.connection.insert(shipments).values(values);
      }

      if (record.operation) {
        const operationValues = {
          id: record.operation.operationId,
          storeId: record.storeId,
          shipmentId: record.operation.shipmentId,
          type: record.operation.type,
          state: record.operation.state,
          idempotencyScope: record.operation.idempotency.scope,
          idempotencyKey: record.operation.idempotency.key,
          requestHash: record.operation.idempotency.requestHash,
          snapshot: record.operation,
          createdAt: record.operation.requestedAt,
          updatedAt: record.operation.completedAt ?? record.operation.requestedAt,
        };
        await this.connection
          .insert(shipmentOperations)
          .values(operationValues)
          .onConflictDoUpdate({
            target: shipmentOperations.id,
            set: {
              state: operationValues.state,
              snapshot: operationValues.snapshot,
              updatedAt: operationValues.updatedAt,
            },
          });
      }

      for (const event of record.trackingEvents) {
        await this.connection
          .insert(shipmentTrackingEvents)
          .values({
            id: await this.generateUuidV7(),
            storeId: record.storeId,
            shipmentId: record.shipment.shipmentId,
            providerEventId: event.providerEventId,
            snapshot: event,
            occurredAt: event.occurredAt,
          })
          .onConflictDoNothing();
      }
      if (record.providerInbox) {
        await this.connection.insert(providerInbox).values({
          id: await this.generateUuidV7(),
          storeId: record.storeId,
          providerAccountId: record.providerInbox.providerAccountId,
          providerEventId: record.providerInbox.providerEventId,
          eventHash: record.providerInbox.eventHash,
          payload: record.providerInbox,
          occurredAt: record.providerInbox.occurredAt,
        });
      }
      for (const event of record.domainEvents) {
        await this.connection
          .insert(deliveryOutbox)
          .values({
            id: event.payload.eventId,
            storeId: record.storeId,
            shipmentId: record.shipment.shipmentId,
            eventType: event.type,
            event,
          })
          .onConflictDoNothing();
      }
      await this.connection.insert(deliveryMutations).values({
        id: record.mutationId,
        storeId: record.storeId,
        shipmentId: record.shipment.shipmentId,
        idempotencyScope: record.idempotency.scope,
        idempotencyKey: record.idempotency.key,
        requestHash: record.idempotency.requestHash,
        shipmentRevision: record.shipment.revision,
      });
      return { status: "APPLIED", shipmentRevision: record.shipment.revision };
    });
  }
}

function shipmentValues(snapshot: Delivery.DeliveryShipmentSnapshot) {
  return {
    id: snapshot.shipmentId,
    organizationId: snapshot.organizationId,
    storeId: snapshot.storeId,
    orderId: snapshot.orderId,
    fulfillmentOrderId: snapshot.fulfillmentOrderId,
    providerAccountId: snapshot.providerAccountId,
    providerShipmentReference: snapshot.providerShipmentReference,
    state: snapshot.state,
    revision: snapshot.revision,
    snapshot,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  };
}
