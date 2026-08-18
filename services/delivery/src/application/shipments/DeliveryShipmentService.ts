import {
  DELIVERY_PROVIDER_PROTOCOL_VERSION,
  DeliveryShipmentTransitions,
  type Delivery,
  type DeliveryEvents,
} from "@shopana/broker-types";
import type { DeliveryFulfillmentPort } from "../../contracts/fulfillment.js";
import type { DeliveryProviderCompletionContext } from "../../contracts/actions.js";
import type {
  DeliveryAtomicMutationRecord,
  DeliveryProviderAppsPort,
  DeliveryProviderInboxRecord,
  DeliveryProviderObservationNormalizerPort,
  DeliveryShipmentTransitionPolicyPort,
} from "../../contracts/ports.js";
import { revision } from "../../domain/canonical.js";
import type { Repository } from "../../repositories/Repository.js";

export interface PreparedShipmentOperation {
  shipment: Delivery.DeliveryShipmentSnapshot;
  operation: Delivery.DeliveryShipmentOperationSnapshot;
  route: Extract<Delivery.DeliveryProviderRouteSnapshot, { capability: "delivery.shipment-provider" }>;
  request: Delivery.DeliveryProviderShipmentRequest;
  duplicate: boolean;
}

export class DeliveryShipmentService {
  constructor(private readonly deps: {
    repository: Repository;
    fulfillment: DeliveryFulfillmentPort;
    apps: DeliveryProviderAppsPort;
    transitions: DeliveryShipmentTransitionPolicyPort;
    normalizer: DeliveryProviderObservationNormalizerPort;
  }) {}

  async prepareCreate(params: Delivery.CreateDeliveryShipmentParams, now: string): Promise<PreparedShipmentOperation | { providerNotConfigured: true; duplicate: boolean }> {
    const scope = `delivery.shipment.create:${params.fulfillmentOrderId}`;
    const idempotency = idem(scope, params.idempotencyKey, params);
    const duplicate = await this.deps.repository.shipments.findOperationByIdempotency(params.storeId, scope, params.idempotencyKey);
    if (duplicate) {
      if (duplicate.idempotency.requestHash !== idempotency.requestHash) throw new Error("DELIVERY_IDEMPOTENCY_CONFLICT");
      const current = await this.requiredShipment(params.storeId, duplicate.shipmentId);
      const shipment = duplicate.state === "PROCESSING"
        ? await this.ensureFulfillmentReserved(current, duplicate, duplicate.route, params, now)
        : current;
      return { shipment, operation: duplicate, route: duplicate.route, request: createRequest(shipment, duplicate, params, now), duplicate: true };
    }
    const availability = await this.deps.fulfillment.getShipmentPlan(params);
    if (availability.status !== "READY") throw new Error(`${availability.code}:${availability.message}`);
    const plan = availability.plan;
    if (!plan.shipmentProvider) return { providerNotConfigured: true, duplicate: false };
    if (!plan.fulfillmentOrder.deliveryMethod) throw new Error("DELIVERY_METHOD_COMMITMENT_MISSING");
    const account = await this.requiredActiveAccount(params.storeId, plan.shipmentProvider.providerAccountId, plan.shipmentProvider.configurationRevision, "createShipment");
    const route = await this.requiredRoute(account, "createShipment");
    const shipmentId = await this.deps.repository.generateUuidV7();
    const operationId = await this.deps.repository.generateUuidV7();
    const shipment: Delivery.DeliveryShipmentSnapshot = {
      shipmentId, organizationId: plan.fulfillmentOrder.organizationId, storeId: params.storeId,
      orderId: plan.fulfillmentOrder.orderId, fulfillmentOrderId: params.fulfillmentOrderId,
      fulfillmentOrderRevision: plan.fulfillmentOrder.revision, shipmentPlanHash: plan.planHash,
      checkoutId: plan.fulfillmentOrder.checkoutId, deliveryGroupId: plan.fulfillmentOrder.deliveryGroupId,
      ratedFactsHash: plan.fulfillmentOrder.deliveryMethod.ratedFactsHash,
      state: "SUBMITTING", providerAccountId: account.providerAccountId, providerCode: account.providerCode,
      providerShipmentReference: null, parcels: [], selectedDeliveryMethod: plan.fulfillmentOrder.deliveryMethod,
      origin: plan.origin, destination: plan.destination, sender: plan.sender, recipient: plan.recipient,
      packages: plan.packages, lastTrackingEvent: null,
      lastProviderShipmentSequence: null, lastFailure: null, lastFulfillmentState: null,
      revision: 1, createdAt: now, updatedAt: now,
    };
    const operation = operationSnapshot(operationId, shipmentId, "CREATE", "PROCESSING", idempotency, route, plan.shipmentProvider.configurationRevision, now);
    const eventId = await this.deps.repository.generateUuidV7();
    const created: DeliveryEvents.ShipmentCreated = {
      ...eventBase(eventId, operationId, params.correlationId, shipment, operation, route, now),
      shipmentState: shipment.state, parcels: shipment.parcels,
    };
    const committed = await this.deps.repository.shipments.commit(mutation(await this.deps.repository.generateUuidV7(), "COMMAND", null, shipment, operation, [], null, idempotency, [{ type: "delivery.shipment.created", payload: created }]));
    if (committed.status === "IDEMPOTENCY_CONFLICT") throw new Error("DELIVERY_IDEMPOTENCY_CONFLICT");
    if (committed.status === "REVISION_CONFLICT") throw new Error("DELIVERY_SHIPMENT_REVISION_CONFLICT");

    const reservedShipment = await this.ensureFulfillmentReserved(shipment, operation, route, params, now);
    return { shipment: reservedShipment, operation, route, request: createRequest(reservedShipment, operation, params, now), duplicate: false };
  }

  async invoke(prepared: PreparedShipmentOperation) {
    if (prepared.operation.type === "CREATE") return this.deps.apps.createShipment(prepared.route as any, prepared.request as Delivery.DeliveryProviderCreateShipmentRequest);
    if (prepared.operation.type === "CANCEL") return this.deps.apps.cancelShipment(prepared.route as any, prepared.request as Delivery.DeliveryProviderCancelShipmentRequest);
    if (prepared.operation.type === "GET") return this.deps.apps.getShipment(prepared.route as any, prepared.request as Delivery.DeliveryProviderGetShipmentRequest);
    return this.deps.apps.reconcileShipment(prepared.route as any, prepared.request as Delivery.DeliveryProviderReconcileShipmentRequest);
  }

  async prepareCancel(params: Delivery.CancelDeliveryShipmentParams, now: string): Promise<PreparedShipmentOperation> {
    return this.prepareExisting("CANCEL", params, now);
  }

  async prepareReconcile(params: Delivery.ReconcileDeliveryShipmentParams, now: string): Promise<PreparedShipmentOperation> {
    return this.prepareExisting("RECONCILE", params, now);
  }

  async complete(prepared: PreparedShipmentOperation, result: Delivery.DeliveryProviderShipmentOperationResult | Delivery.DeliveryProviderReconcileShipmentResult, correlationId: string, providerEventId: string | null = null): Promise<void> {
    if (prepared.operation.state === "SUCCEEDED" || prepared.operation.state === "FAILED") return;
    const occurredAt = result.status === "RECONCILED" ? result.observedAt : result.status === "SUCCEEDED" ? result.processedAt : result.status === "PENDING" ? result.observedAt : result.failedAt;
    if (result.status === "FAILED") {
      await this.failPrepared(prepared.shipment, prepared.operation, prepared.route, correlationId, occurredAt, result.failure, result.providerShipmentReference);
      if (prepared.operation.type === "CREATE" && !result.failure.acceptedByProvider) await this.releaseFulfillment(prepared.shipment, occurredAt);
      return;
    }
    const providerReference = result.providerShipmentReference;
    if (prepared.shipment.providerShipmentReference && prepared.shipment.providerShipmentReference !== providerReference) {
      throw new Error("DELIVERY_PROVIDER_SHIPMENT_REFERENCE_CONFLICT");
    }
    const observedState = result.status === "PENDING" && result.shipmentState === "CANCELLING" ? null : result.shipmentState;
    const parcels = "parcels" in result ? result.parcels : [];
    const events = "events" in result ? result.events : [];
    const current = await this.requiredShipment(prepared.shipment.storeId, prepared.shipment.shipmentId);
    const account = await this.deps.repository.providerAccounts.getById(current.storeId, current.providerAccountId);
    const capabilities = account?.capabilityStates.shipmentProvider?.capabilities;
    if (!capabilities) throw new Error("DELIVERY_SHIPMENT_PROVIDER_CAPABILITIES_MISSING");
    if (!capabilities.supportsMultipleParcels && parcels.length > 1) throw new Error("DELIVERY_PROVIDER_MULTIPLE_PARCELS_UNSUPPORTED");
    if (!capabilities.supportsLabels && parcels.some(({ labels }) => labels.length > 0)) throw new Error("DELIVERY_PROVIDER_LABELS_UNSUPPORTED");
    if (!capabilities.supportsTracking && (events.length > 0 || parcels.some(({ tracking }) => tracking.length > 0))) throw new Error("DELIVERY_PROVIDER_TRACKING_UNSUPPORTED");
    const normalized = await this.deps.normalizer.normalize({ current, route: prepared.route, parcels, events, observedAt: occurredAt });
    if (normalized.status === "REJECTED") {
      await this.failPrepared(current, prepared.operation, prepared.route, correlationId, occurredAt, failure("INVALID_REQUEST", normalized.code, normalized.message, normalized.retryable));
      return;
    }
    if (prepared.operation.type === "CREATE" && result.status === "SUCCEEDED") {
      const assigned = new Set(normalized.parcels.flatMap(({ packageIds }) => packageIds));
      if (current.packages.some(({ packageId }) => !assigned.has(packageId))) throw new Error("DELIVERY_PROVIDER_PACKAGE_COVERAGE_INCOMPLETE");
    }
    const latestEvent = [...normalized.events].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt)).at(-1) ?? null;
    const transition = observedState === null
      ? { status: "APPLY" as const, nextState: "CANCELLING" as const }
      : this.deps.transitions.evaluate({
          current, observedState, occurredAt,
          providerEventId: latestEvent?.providerEventId ?? `${prepared.operation.operationId}:completion`,
          providerShipmentSequence: latestEvent?.providerShipmentSequence ?? null,
        });
    if (transition.status === "REJECT_INVALID") throw new Error(transition.code);
    const state = transition.status === "APPLY" ? transition.nextState : current.state;
    const next: Delivery.DeliveryShipmentSnapshot = {
      ...current, state, providerShipmentReference: providerReference,
      parcels: normalized.parcels.length > 0 ? normalized.parcels : current.parcels,
      lastTrackingEvent: latestEvent ?? current.lastTrackingEvent,
      lastProviderShipmentSequence: latestEvent?.providerShipmentSequence ?? current.lastProviderShipmentSequence,
      lastFailure: null, revision: current.revision + 1, updatedAt: occurredAt,
    };
    const operation: Delivery.DeliveryShipmentOperationSnapshot = {
      ...prepared.operation,
      state: result.status === "PENDING" ? "PENDING" : "SUCCEEDED",
      providerShipmentReference: providerReference, failure: null,
      revision: prepared.operation.revision + 1,
      completedAt: result.status === "PENDING" ? null : occurredAt,
    };
    const completionResultHash = revision("dprovider_result_v1", result);
    const completionIdempotency = idem(`delivery.shipment.complete:${operation.operationId}`, completionResultHash, result);
    const domainEvents = await this.observationEvents(current, next, operation, prepared.route, correlationId, normalized.events, occurredAt);
    const inbox = providerEventId ? { storeId: current.storeId, providerAccountId: current.providerAccountId, providerEventId, providerShipmentSequence: latestEvent?.providerShipmentSequence ?? null, eventHash: completionIdempotency.requestHash, occurredAt } : null;
    const committed = await this.deps.repository.shipments.commit(mutation(
      await this.deps.repository.generateUuidV7(), "PROVIDER_COMPLETION", current.revision, next, operation,
      normalized.events, inbox, completionIdempotency, domainEvents,
    ));
    if (!["APPLIED", "DUPLICATE"].includes(committed.status)) throw new Error(`DELIVERY_COMPLETION_${committed.status}`);
    if (committed.status === "APPLIED" || committed.status === "DUPLICATE") {
      await this.propagateState(await this.requiredShipment(current.storeId, current.shipmentId), occurredAt);
    }
  }

  async get(params: Delivery.GetDeliveryShipmentParams): Promise<Delivery.GetDeliveryShipmentResult> {
    const shipment = await this.requiredShipment(params.storeId, params.shipmentId);
    const [operations, trackingEvents] = await Promise.all([
      this.deps.repository.shipments.listOperations(params.storeId, params.shipmentId),
      this.deps.repository.shipments.listTrackingEvents(params.storeId, params.shipmentId),
    ]);
    return { shipment, operations, trackingEvents };
  }

  async completeProviderOperation(params: Delivery.CompleteDeliveryProviderOperationParams, context: DeliveryProviderCompletionContext): Promise<Delivery.CompleteDeliveryProviderOperationResult> {
    const shipment = await this.requiredShipment(context.storeId, params.shipmentId);
    const operations = await this.deps.repository.shipments.listOperations(context.storeId, params.shipmentId);
    const operation = operations.find(({ operationId }) => operationId === params.operationId);
    if (!operation || operation.type !== params.operationType) throw new Error("DELIVERY_PROVIDER_OPERATION_NOT_FOUND");
    this.assertProviderContext(shipment, operation.route, context);
    const duplicate = operation.state === "SUCCEEDED" || operation.state === "FAILED";
    if (!duplicate) {
      await this.complete({ shipment, operation, route: operation.route, request: {} as Delivery.DeliveryProviderShipmentRequest, duplicate: false }, params.result, context.correlationId ?? params.providerEventId, params.providerEventId);
    } else if (operation.state === "FAILED" && operation.type === "CREATE" && !operation.failure?.acceptedByProvider && shipment.lastFulfillmentState === "SHIPMENT_CREATED") {
      await this.releaseFulfillment(shipment, operation.completedAt ?? operation.requestedAt);
    } else {
      await this.propagateState(shipment, params.occurredAt);
    }
    const current = await this.requiredShipment(context.storeId, params.shipmentId);
    return { accepted: true, duplicate, shipmentRevision: current.revision };
  }

  async reportProviderEvent(params: Delivery.ReportDeliveryProviderEventParams, context: DeliveryProviderCompletionContext): Promise<Delivery.ReportDeliveryProviderEventResult> {
    const event = params.event;
    const account = await this.deps.repository.providerAccounts.getByInstallation(context.storeId, context.installationId);
    if (!account || account.organizationId !== context.organizationId || account.appCode !== context.appCode) throw new Error("DELIVERY_PROVIDER_CONTEXT_MISMATCH");
    const capabilities = account.capabilityStates.shipmentProvider?.capabilities;
    if (!capabilities) throw new Error("DELIVERY_SHIPMENT_PROVIDER_CAPABILITIES_MISSING");
    if (event.type === "SHIPMENT_STATUS_CHANGED" && !capabilities.supportsTracking) throw new Error("DELIVERY_PROVIDER_TRACKING_UNSUPPORTED");
    if (event.type === "SHIPMENT_LABEL_AVAILABLE" && !capabilities.supportsLabels) throw new Error("DELIVERY_PROVIDER_LABELS_UNSUPPORTED");
    const shipment = await this.deps.repository.shipments.findByProviderReference(context.storeId, account.providerAccountId, event.providerShipmentReference);
    if (!shipment) throw new Error("DELIVERY_PROVIDER_SHIPMENT_NOT_FOUND");
    const operations = await this.deps.repository.shipments.listOperations(context.storeId, shipment.shipmentId);
    const operation = operations.at(-1);
    if (!operation) throw new Error("DELIVERY_PROVIDER_OPERATION_NOT_FOUND");
    this.assertProviderContext(shipment, operation.route, context);
    const idempotency = idem(`delivery.shipment.provider-event:${account.providerAccountId}`, params.providerEventId, params);
    let providerParcels: readonly Delivery.DeliveryProviderParcelObservation[] = [];
    let providerEvents: readonly Delivery.DeliveryProviderTrackingEvent[] = [];
    if (event.type === "SHIPMENT_STATUS_CHANGED") {
      providerParcels = event.parcel ? [event.parcel] : [];
      providerEvents = [event.event];
    } else {
      const parcel = shipment.parcels.find(({ providerParcelReference }) => providerParcelReference === event.providerParcelReference);
      if (!parcel) throw new Error("DELIVERY_PROVIDER_PARCEL_NOT_FOUND");
      const parcelState = isProviderState(parcel.state) ? parcel.state : "PENDING";
      providerParcels = [{
        providerParcelReference: event.providerParcelReference,
        packageIds: parcel.packageIds as [string, ...string[]], state: parcelState,
        tracking: parcel.tracking, labels: [event.label], estimatedDeliveryAt: parcel.estimatedDeliveryAt, deliveredAt: parcel.deliveredAt,
      }];
    }
    const normalized = await this.deps.normalizer.normalize({ current: shipment, route: operation.route, parcels: providerParcels, events: providerEvents, observedAt: params.occurredAt });
    if (normalized.status === "REJECTED") throw new Error(normalized.code);
    const transition = event.type === "SHIPMENT_STATUS_CHANGED"
      ? this.deps.transitions.evaluate({ current: shipment, observedState: event.shipmentState, occurredAt: params.occurredAt, providerEventId: params.providerEventId, providerShipmentSequence: params.providerShipmentSequence })
      : { status: "APPLY" as const, nextState: shipment.state };
    if (transition.status === "REJECT_INVALID") throw new Error(transition.code);
    if (transition.status === "IGNORE_STALE") {
      await this.propagateState(shipment, params.occurredAt);
      const current = await this.requiredShipment(context.storeId, shipment.shipmentId);
      return { accepted: true, duplicate: true, shipmentId: current.shipmentId, shipmentRevision: current.revision };
    }
    const tracking = normalized.events;
    const next = {
      ...shipment, state: transition.nextState,
      parcels: event.type === "SHIPMENT_LABEL_AVAILABLE"
        ? normalized.parcels.map((parcel) => parcel.providerParcelReference === event.providerParcelReference ? { ...parcel, state: shipment.parcels.find((prior) => prior.providerParcelReference === parcel.providerParcelReference)?.state ?? parcel.state } : parcel)
        : normalized.parcels,
      lastTrackingEvent: tracking.at(-1) ?? shipment.lastTrackingEvent,
      lastProviderShipmentSequence: params.providerShipmentSequence ?? shipment.lastProviderShipmentSequence,
      revision: shipment.revision + 1, updatedAt: params.occurredAt,
    };
    const events = await this.observationEvents(shipment, next, operation, operation.route, context.correlationId ?? params.providerEventId, tracking, params.occurredAt);
    const result = await this.deps.repository.shipments.commit({
      mutationId: await this.deps.repository.generateUuidV7(), cause: "PROVIDER_EVENT", storeId: context.storeId,
      expectedShipmentRevision: shipment.revision, idempotency, shipment: next, operation: null, trackingEvents: tracking,
      providerInbox: { storeId: context.storeId, providerAccountId: account.providerAccountId, providerEventId: params.providerEventId, providerShipmentSequence: params.providerShipmentSequence, eventHash: idempotency.requestHash, occurredAt: params.occurredAt },
      domainEvents: events,
    });
    if (result.status === "IDEMPOTENCY_CONFLICT") throw new Error("DELIVERY_PROVIDER_EVENT_CONFLICT");
    if (result.status === "REVISION_CONFLICT") throw new Error("DELIVERY_SHIPMENT_REVISION_CONFLICT");
    if (result.status === "APPLIED" || result.status === "DUPLICATE") {
      await this.propagateState(await this.requiredShipment(context.storeId, shipment.shipmentId), params.occurredAt);
    }
    const current = await this.requiredShipment(context.storeId, shipment.shipmentId);
    return { accepted: true, duplicate: result.status === "DUPLICATE", shipmentId: current.shipmentId, shipmentRevision: current.revision };
  }

  private async prepareExisting(type: "CANCEL" | "RECONCILE", params: Delivery.CancelDeliveryShipmentParams | Delivery.ReconcileDeliveryShipmentParams, now: string): Promise<PreparedShipmentOperation> {
    const scope = `delivery.shipment.${type.toLowerCase()}:${params.shipmentId}`;
    const idempotency = idem(scope, params.idempotencyKey, params);
    const prior = await this.deps.repository.shipments.findOperationByIdempotency(params.storeId, scope, params.idempotencyKey);
    const shipment = await this.requiredShipment(params.storeId, params.shipmentId);
    if (prior) {
      if (prior.idempotency.requestHash !== idempotency.requestHash) throw new Error("DELIVERY_IDEMPOTENCY_CONFLICT");
      return { shipment, operation: prior, route: prior.route, request: existingRequest(shipment, prior, params, now), duplicate: true };
    }
    if (shipment.revision !== params.expectedShipmentRevision) throw new Error("DELIVERY_SHIPMENT_REVISION_CONFLICT");
    if (!shipment.providerShipmentReference) throw new Error("DELIVERY_PROVIDER_SHIPMENT_REFERENCE_MISSING");
    if (type === "CANCEL" && !(DeliveryShipmentTransitions[shipment.state] as readonly Delivery.DeliveryShipmentState[]).includes("CANCELLING")) throw new Error("DELIVERY_SHIPMENT_CANCELLATION_INVALID");
    if (type === "RECONCILE" && (shipment.state === "CANCELLED" || shipment.state === "RETURNED")) throw new Error("DELIVERY_SHIPMENT_RECONCILIATION_INVALID");
    const account = type === "CANCEL"
      ? await this.requiredActiveAccount(params.storeId, shipment.providerAccountId, null, "cancelShipment")
      : await this.requiredReconciliationAccount(params.storeId, shipment.providerAccountId);
    const providerOperation = type === "CANCEL"
      ? "cancelShipment" as const
      : account.supportedOperations.includes("reconcileShipment") ? "reconcileShipment" as const : "getShipment" as const;
    const route = await this.requiredRoute(account, providerOperation);
    const configurationRevision = account.capabilityStates.shipmentProvider?.configurationRevision;
    if (!configurationRevision) throw new Error("DELIVERY_SHIPMENT_PROVIDER_CAPABILITIES_MISSING");
    const operationType: Delivery.DeliveryShipmentOperationType = type === "CANCEL" ? "CANCEL" : providerOperation === "getShipment" ? "GET" : "RECONCILE";
    const operation = operationSnapshot(await this.deps.repository.generateUuidV7(), shipment.shipmentId, operationType, "PROCESSING", idempotency, route, configurationRevision, now);
    const next = { ...shipment, state: type === "CANCEL" ? "CANCELLING" as const : shipment.state, revision: shipment.revision + 1, updatedAt: now };
    const result = await this.deps.repository.shipments.commit(mutation(await this.deps.repository.generateUuidV7(), "COMMAND", shipment.revision, next, operation, [], null, idempotency, []));
    if (result.status !== "APPLIED") throw new Error(`DELIVERY_${result.status}`);
    return { shipment: next, operation, route, request: existingRequest(next, operation, params, now), duplicate: false };
  }

  private async requiredActiveAccount(storeId: string, providerAccountId: string, configurationRevision: string | null, operation: Delivery.DeliveryShipmentProviderOperation) {
    const account = await this.deps.repository.providerAccounts.getById(storeId, providerAccountId);
    const capability = account?.capabilityStates.shipmentProvider;
    if (!account || capability?.status !== "ACTIVE" || !account.supportedOperations.includes(operation)) throw new Error("DELIVERY_SHIPMENT_PROVIDER_INACTIVE");
    if (configurationRevision !== null && capability.configurationRevision !== configurationRevision) throw new Error("DELIVERY_SHIPMENT_CONFIGURATION_REVISION_CONFLICT");
    return account;
  }

  private async requiredReconciliationAccount(storeId: string, providerAccountId: string) {
    const account = await this.deps.repository.providerAccounts.getById(storeId, providerAccountId);
    const capability = account?.capabilityStates.shipmentProvider;
    if (!account || capability?.status !== "ACTIVE" || !account.supportedOperations.some((operation) => operation === "reconcileShipment" || operation === "getShipment")) {
      throw new Error("DELIVERY_SHIPMENT_RECONCILIATION_UNAVAILABLE");
    }
    return account;
  }

  private async requiredRoute(account: Delivery.DeliveryProviderAccountSnapshot, operation: Delivery.DeliveryShipmentProviderOperation) {
    const route = await this.deps.apps.resolveRoute({ storeId: account.storeId, capability: "delivery.shipment-provider", operation, installationId: account.installationId });
    if (!route || route.appCode !== account.appCode || route.appVersion !== account.appVersion) throw new Error("DELIVERY_SHIPMENT_PROVIDER_ROUTE_UNAVAILABLE");
    return route as Extract<Delivery.DeliveryProviderRouteSnapshot, { capability: "delivery.shipment-provider" }>;
  }

  private async requiredShipment(storeId: string, shipmentId: string) {
    const shipment = await this.deps.repository.shipments.get(storeId, shipmentId);
    if (!shipment) throw new Error("DELIVERY_SHIPMENT_NOT_FOUND");
    return shipment;
  }

  private async ensureFulfillmentReserved(shipment: Delivery.DeliveryShipmentSnapshot, operation: Delivery.DeliveryShipmentOperationSnapshot, route: PreparedShipmentOperation["route"], params: Delivery.CreateDeliveryShipmentParams, now: string): Promise<Delivery.DeliveryShipmentSnapshot> {
    if (shipment.revision > 1) return shipment;
    const reserved = await this.deps.fulfillment.applyShipmentUpdate({ storeId: shipment.storeId, update: {
      fulfillmentOrderId: shipment.fulfillmentOrderId,
      expectedFulfillmentOrderRevision: params.expectedFulfillmentOrderRevision,
      shipmentId: shipment.shipmentId, shipmentRevision: shipment.revision, lineItems: fulfillmentLines(shipment),
      state: "SHIPMENT_CREATED", occurredAt: now,
    }});
    if (reserved.status === "REVISION_CONFLICT") {
      await this.failPrepared(shipment, operation, route, params.correlationId, now, failure("CONFLICT", "FULFILLMENT_REVISION_CONFLICT", "The fulfillment allocation changed before shipment reservation", false));
      throw new Error("FULFILLMENT_ORDER_REVISION_CONFLICT");
    }
    const next = { ...shipment, fulfillmentOrderRevision: reserved.fulfillmentOrderRevision, lastFulfillmentState: "SHIPMENT_CREATED" as const, revision: 2, updatedAt: now };
    const reserveIdempotency = idem(`delivery.shipment.reserve:${shipment.shipmentId}`, `${params.idempotencyKey}:reserve`, { fulfillmentOrderRevision: reserved.fulfillmentOrderRevision });
    const committed = await this.deps.repository.shipments.commit(mutation(await this.deps.repository.generateUuidV7(), "COMMAND", 1, next, operation, [], null, reserveIdempotency, []));
    if (!["APPLIED", "DUPLICATE"].includes(committed.status)) throw new Error("DELIVERY_SHIPMENT_RESERVATION_PERSIST_FAILED");
    return committed.status === "DUPLICATE" ? this.requiredShipment(shipment.storeId, shipment.shipmentId) : next;
  }

  private assertProviderContext(shipment: Delivery.DeliveryShipmentSnapshot, route: Delivery.DeliveryProviderRouteSnapshot, context: DeliveryProviderCompletionContext) {
    if (shipment.organizationId !== context.organizationId || shipment.storeId !== context.storeId || route.installationId !== context.installationId || route.appCode !== context.appCode || route.appVersion !== context.appVersion) {
      throw new Error("DELIVERY_PROVIDER_CONTEXT_MISMATCH");
    }
  }

  private async failPrepared(shipment: Delivery.DeliveryShipmentSnapshot, operation: Delivery.DeliveryShipmentOperationSnapshot, route: PreparedShipmentOperation["route"], correlationId: string, at: string, providerFailure: Delivery.DeliveryProviderFailure, providerShipmentReference: string | null = null) {
    const current = await this.requiredShipment(shipment.storeId, shipment.shipmentId);
    const state = operation.type === "GET" || operation.type === "RECONCILE" ? current.state : "FAILED" as const;
    const next = { ...current, state, providerShipmentReference: providerShipmentReference ?? current.providerShipmentReference, lastFailure: providerFailure, revision: current.revision + 1, updatedAt: at };
    const failedOperation = { ...operation, state: "FAILED" as const, providerShipmentReference: providerShipmentReference ?? operation.providerShipmentReference, failure: providerFailure, revision: operation.revision + 1, completedAt: at };
    const eventId = await this.deps.repository.generateUuidV7();
    const payload: DeliveryEvents.OperationFailed = { ...eventBase(eventId, operation.operationId, correlationId, next, failedOperation, route, at), shipmentState: next.state, failure: providerFailure };
    const domainEvents: import("../../contracts/ports.js").DeliveryDomainEvent[] = [{ type: "delivery.shipment.operation_failed", payload }];
    if (current.state !== next.state) {
      const stateEventId = await this.deps.repository.generateUuidV7();
      domainEvents.unshift({ type: "delivery.shipment.state_changed", payload: { ...eventBase(stateEventId, operation.operationId, correlationId, next, failedOperation, route, at), previousState: current.state, state: next.state } });
    }
    const completion = idem(`delivery.shipment.fail:${operation.operationId}`, `${operation.idempotency.key}:failed`, providerFailure);
    const result = await this.deps.repository.shipments.commit(mutation(await this.deps.repository.generateUuidV7(), "PROVIDER_COMPLETION", current.revision, next, failedOperation, [], null, completion, domainEvents));
    if (!["APPLIED", "DUPLICATE"].includes(result.status)) throw new Error(`DELIVERY_FAILURE_${result.status}`);
  }

  private async releaseFulfillment(shipment: Delivery.DeliveryShipmentSnapshot, occurredAt: string) {
    const current = await this.requiredShipment(shipment.storeId, shipment.shipmentId);
    if (current.lastFulfillmentState === "CANCELLED") return;
    if (current.lastFulfillmentState !== "SHIPMENT_CREATED") return;
    const released = await this.deps.fulfillment.applyShipmentUpdate({ storeId: current.storeId, update: {
      fulfillmentOrderId: current.fulfillmentOrderId,
      expectedFulfillmentOrderRevision: current.fulfillmentOrderRevision,
      shipmentId: current.shipmentId, shipmentRevision: shipment.revision + 1,
      lineItems: fulfillmentLines(current), state: "CANCELLED", occurredAt,
    }});
    if (released.status === "REVISION_CONFLICT") throw new Error("FULFILLMENT_ORDER_REVISION_CONFLICT");
    const next = { ...current, fulfillmentOrderRevision: released.fulfillmentOrderRevision, lastFulfillmentState: "CANCELLED" as const, revision: current.revision + 1, updatedAt: occurredAt };
    const sync = idem(`delivery.shipment.fulfillment-release:${current.shipmentId}`, `${current.revision}:${released.fulfillmentOrderRevision}`, released);
    const committed = await this.deps.repository.shipments.commit(mutation(await this.deps.repository.generateUuidV7(), "COMMAND", current.revision, next, null, [], null, sync, []));
    if (!["APPLIED", "DUPLICATE"].includes(committed.status)) throw new Error(`DELIVERY_FULFILLMENT_RELEASE_${committed.status}`);
  }

  private async propagateState(shipment: Delivery.DeliveryShipmentSnapshot, occurredAt: string) {
    const state = fulfillmentState(shipment.state);
    if (!state) return;
    if (shipment.lastFulfillmentState === state) return;
    const result = await this.deps.fulfillment.applyShipmentUpdate({ storeId: shipment.storeId, update: {
      fulfillmentOrderId: shipment.fulfillmentOrderId,
      expectedFulfillmentOrderRevision: shipment.fulfillmentOrderRevision,
      shipmentId: shipment.shipmentId, shipmentRevision: shipment.revision,
      lineItems: fulfillmentLines(shipment), state, occurredAt,
    }});
    if (result.status === "REVISION_CONFLICT") throw new Error("FULFILLMENT_ORDER_REVISION_CONFLICT");
    if (result.fulfillmentOrderRevision !== shipment.fulfillmentOrderRevision || shipment.lastFulfillmentState !== state) {
      const next = { ...shipment, fulfillmentOrderRevision: result.fulfillmentOrderRevision, lastFulfillmentState: state, revision: shipment.revision + 1, updatedAt: occurredAt };
      const syncIdempotency = idem(`delivery.shipment.fulfillment-sync:${shipment.shipmentId}`, `${shipment.revision}:${result.fulfillmentOrderRevision}`, result);
      const committed = await this.deps.repository.shipments.commit(mutation(await this.deps.repository.generateUuidV7(), "COMMAND", shipment.revision, next, null, [], null, syncIdempotency, []));
      if (!["APPLIED", "DUPLICATE"].includes(committed.status)) throw new Error(`DELIVERY_FULFILLMENT_SYNC_${committed.status}`);
    }
  }

  private async observationEvents(previous: Delivery.DeliveryShipmentSnapshot, next: Delivery.DeliveryShipmentSnapshot, operation: Delivery.DeliveryShipmentOperationSnapshot, route: PreparedShipmentOperation["route"], correlationId: string, tracking: readonly Delivery.DeliveryTrackingEventSnapshot[], at: string) {
    const events: import("../../contracts/ports.js").DeliveryDomainEvent[] = [];
    if (previous.state !== next.state) {
      const id = await this.deps.repository.generateUuidV7();
      events.push({ type: "delivery.shipment.state_changed", payload: { ...eventBase(id, operation.operationId, correlationId, next, operation, route, at), previousState: previous.state, state: next.state } });
    }
    for (const trackingEvent of tracking) {
      const id = await this.deps.repository.generateUuidV7();
      events.push({ type: "delivery.shipment.tracking_updated", payload: { ...eventBase(id, operation.operationId, correlationId, next, operation, route, trackingEvent.occurredAt), shipmentState: next.state, event: trackingEvent } });
    }
    const priorLabels = new Set(previous.parcels.flatMap(({ labels }) => labels.map(({ mediaId }) => mediaId)));
    for (const parcel of next.parcels) {
      for (const label of parcel.labels) {
        if (priorLabels.has(label.mediaId)) continue;
        const id = await this.deps.repository.generateUuidV7();
        events.push({ type: "delivery.shipment.label_available", payload: { ...eventBase(id, operation.operationId, correlationId, next, operation, route, at), shipmentState: next.state, parcelId: parcel.parcelId, providerParcelReference: parcel.providerParcelReference, label } });
      }
    }
    return events;
  }
}

function idem(scope: string, key: string, value: unknown): Delivery.DeliveryIdempotencySnapshot {
  return { scope, key, requestHash: revision("didem_v1", value) };
}

function operationSnapshot(operationId: string, shipmentId: string, type: Delivery.DeliveryShipmentOperationType, state: Delivery.DeliveryShipmentOperationState, idempotency: Delivery.DeliveryIdempotencySnapshot, route: PreparedShipmentOperation["route"], configurationRevision: string, now: string): Delivery.DeliveryShipmentOperationSnapshot {
  return { operationId, shipmentId, type, state, idempotency, route, configurationRevision, providerShipmentReference: null, failure: null, revision: 1, requestedAt: now, completedAt: null };
}

function createRequest(shipment: Delivery.DeliveryShipmentSnapshot, operation: Delivery.DeliveryShipmentOperationSnapshot, params: Delivery.CreateDeliveryShipmentParams, now: string): Delivery.DeliveryProviderCreateShipmentRequest {
  const method = shipment.selectedDeliveryMethod;
  return {
    protocolVersion: DELIVERY_PROVIDER_PROTOCOL_VERSION, storeId: shipment.storeId, operationId: operation.operationId,
    shipmentId: shipment.shipmentId, providerAccountId: shipment.providerAccountId, idempotencyKey: operation.idempotency.key,
    idempotencyRequestHash: operation.idempotency.requestHash, correlationId: params.correlationId,
    deadlineAt: new Date(Date.parse(now) + 120_000).toISOString(), operation: "CREATE", orderReference: shipment.orderId,
    fulfillmentOrderReference: shipment.fulfillmentOrderId, shipmentConfigurationRevision: operation.configurationRevision,
    shipmentPlanHash: shipment.shipmentPlanHash, deliveryMethodCommitmentId: method.commitmentId,
    ratedFactsHash: shipment.ratedFactsHash, deliveryMethodCode: method.code,
    selectedRate: method.source === "MANUAL" ? { source: "MANUAL", serviceCode: method.serviceCode } : { source: "CARRIER_SERVICE", carrierCode: method.carrierCode, serviceCode: method.serviceCode },
    origin: shipment.origin, destination: shipment.destination, sender: shipment.sender, recipient: shipment.recipient,
    packages: shipment.packages, customerInput: method.customerInput, customerInputHash: method.customerInputHash,
  };
}

function existingRequest(shipment: Delivery.DeliveryShipmentSnapshot, operation: Delivery.DeliveryShipmentOperationSnapshot, params: Delivery.CancelDeliveryShipmentParams | Delivery.ReconcileDeliveryShipmentParams, now: string): Delivery.DeliveryProviderCancelShipmentRequest | Delivery.DeliveryProviderGetShipmentRequest | Delivery.DeliveryProviderReconcileShipmentRequest {
  const base = { protocolVersion: DELIVERY_PROVIDER_PROTOCOL_VERSION, storeId: shipment.storeId, operationId: operation.operationId, shipmentId: shipment.shipmentId, providerAccountId: shipment.providerAccountId, idempotencyKey: operation.idempotency.key, idempotencyRequestHash: operation.idempotency.requestHash, correlationId: params.correlationId, deadlineAt: new Date(Date.parse(now) + 120_000).toISOString(), providerShipmentReference: shipment.providerShipmentReference! };
  if (operation.type === "CANCEL") return { ...base, operation: "CANCEL", reason: "reason" in params ? params.reason : null };
  if (operation.type === "GET") {
    const { idempotencyKey: _key, idempotencyRequestHash: _hash, ...getBase } = base;
    return { ...getBase, operation: "GET" };
  }
  return { ...base, operation: "RECONCILE" };
}

function mutation(mutationId: string, cause: DeliveryAtomicMutationRecord["cause"], expectedShipmentRevision: number | null, shipment: Delivery.DeliveryShipmentSnapshot, operation: Delivery.DeliveryShipmentOperationSnapshot | null, trackingEvents: readonly Delivery.DeliveryTrackingEventSnapshot[], providerInbox: DeliveryProviderInboxRecord | null, idempotency: Delivery.DeliveryIdempotencySnapshot, domainEvents: DeliveryAtomicMutationRecord["domainEvents"]): DeliveryAtomicMutationRecord {
  return { mutationId, cause, storeId: shipment.storeId, expectedShipmentRevision, idempotency, shipment, operation, trackingEvents, providerInbox, domainEvents };
}

function failure(category: Delivery.DeliveryProviderFailureCategory, code: string, message: string, retryable: boolean): Delivery.DeliveryProviderFailure {
  return { category, code, message, retryable, acceptedByProvider: false, providerCode: null };
}

function fulfillmentLines(shipment: Delivery.DeliveryShipmentSnapshot): [Delivery.DeliveryFulfillmentOrderLineItemInput, ...Delivery.DeliveryFulfillmentOrderLineItemInput[]] {
  const quantities = new Map<string, number>();
  for (const item of shipment.packages.flatMap(({ items }) => items)) quantities.set(item.lineId, (quantities.get(item.lineId) ?? 0) + item.quantity);
  return [...quantities].map(([fulfillmentOrderLineItemId, quantity]) => ({ fulfillmentOrderLineItemId, quantity })) as [Delivery.DeliveryFulfillmentOrderLineItemInput, ...Delivery.DeliveryFulfillmentOrderLineItemInput[]];
}

function fulfillmentState(state: Delivery.DeliveryShipmentState): Delivery.DeliveryFulfillmentShipmentUpdate["state"] | null {
  if (state === "IN_TRANSIT" || state === "DELIVERED" || state === "DELIVERY_FAILED" || state === "CANCELLED") return state;
  return null;
}

function eventBase(eventId: string, causationId: string, correlationId: string, shipment: Delivery.DeliveryShipmentSnapshot, operation: Delivery.DeliveryShipmentOperationSnapshot, route: PreparedShipmentOperation["route"], occurredAt: string): DeliveryEvents.Base {
  return { schemaVersion: 1, eventId, causationId, correlationId, shipmentId: shipment.shipmentId, operationId: operation.operationId, organizationId: shipment.organizationId, storeId: shipment.storeId, checkoutId: shipment.checkoutId, orderId: shipment.orderId, fulfillmentOrderId: shipment.fulfillmentOrderId, providerCode: shipment.providerCode, providerAccountId: shipment.providerAccountId, providerShipmentReference: shipment.providerShipmentReference, route, operationType: operation.type, shipmentRevision: shipment.revision, occurredAt };
}

function isProviderState(state: Delivery.DeliveryShipmentState): state is Delivery.DeliveryProviderObservedShipmentState {
  return ["PENDING", "ACCEPTED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "DELIVERY_FAILED", "RETURNING", "RETURNED", "CANCELLED"].includes(state);
}
