import { Injectable } from "@nestjs/common";
import type {
  CancelOrderFromCheckoutPlacementV1Params,
  ConfirmOrderFromCheckoutPlacementV1Params,
  CreateOrderFromCheckoutPlacementV1Params,
  CreateOrderFromCheckoutPlacementV1Result,
  OrderCheckoutPlacementV1Result,
} from "@shopana/broker-types";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  type ServiceBroker,
  TransactionalStep,
  Workflow,
} from "@shopana/shared-kernel";
import {
  cancelOrderFromCheckoutPlacementV1Schema,
  confirmOrderFromCheckoutPlacementV1Schema,
  createOrderFromCheckoutPlacementV1Schema,
  orderPlacementSnapshotHash,
} from "../../domain/placement/OrderPlacementContracts.js";
import { Repository } from "../../repositories/Repository.js";
import type { EventEmitResult } from "@shopana/events";

@Injectable()
export class CreateOrderFromCheckoutPlacementWorkflow extends BrokerWorkflows<
  CreateOrderFromCheckoutPlacementV1Params,
  CreateOrderFromCheckoutPlacementV1Result
> {
  constructor(
    @InjectBroker("order") broker: ServiceBroker,
    private readonly repository: Repository,
  ) {
    super(broker);
  }

  @Workflow("createOrderFromCheckoutPlacementV1", { idempotencyStrategy: "content" })
  async run(
    rawInput: CreateOrderFromCheckoutPlacementV1Params,
  ): Promise<CreateOrderFromCheckoutPlacementV1Result> {
    const input = createOrderFromCheckoutPlacementV1Schema.parse(rawInput);
    const computedHash = orderPlacementSnapshotHash(input);
    if (computedHash !== input.snapshotHash)
      throw new Error("CHECKOUT_PLACEMENT_SNAPSHOT_HASH_MISMATCH");
    if (input.requestedOrderId !== input.commitments.inventory.reservationKey) {
      throw new Error("CHECKOUT_PLACEMENT_INVENTORY_RESERVATION_MISMATCH");
    }
    const result = await this.commit(input);
    await emitPlacementEvent(this.broker, input, "orderPlaced", {
      schemaVersion: 1,
      organizationId: input.organizationId,
      storeId: input.storeId,
      orderId: result.orderId,
      orderVersion: result.orderVersion,
      placementId: input.placementId,
      checkoutId: input.checkoutId,
      snapshotHash: input.snapshotHash,
      placedAt: result.placedAt,
    });
    return result;
  }

  @TransactionalStep({
    txManager: (self: CreateOrderFromCheckoutPlacementWorkflow) => self.repository.txManager,
    bridge: (self: CreateOrderFromCheckoutPlacementWorkflow) =>
      self.repository.dbosTransactionBridge,
  })
  private commit(
    input: CreateOrderFromCheckoutPlacementV1Params,
  ): Promise<CreateOrderFromCheckoutPlacementV1Result> {
    return this.repository.checkoutPlacement.create(input);
  }
}

@Injectable()
export class ConfirmOrderFromCheckoutPlacementWorkflow extends BrokerWorkflows<
  ConfirmOrderFromCheckoutPlacementV1Params,
  OrderCheckoutPlacementV1Result
> {
  constructor(
    @InjectBroker("order") broker: ServiceBroker,
    private readonly repository: Repository,
  ) {
    super(broker);
  }

  @Workflow("confirmOrderFromCheckoutPlacementV1", { idempotencyStrategy: "content" })
  async run(
    rawInput: ConfirmOrderFromCheckoutPlacementV1Params,
  ): Promise<OrderCheckoutPlacementV1Result> {
    const input = confirmOrderFromCheckoutPlacementV1Schema.parse(rawInput);
    const result = await this.commit(input);
    await emitPlacementEvent(this.broker, input, "orderPlacementConfirmed", {
      schemaVersion: 1,
      organizationId: input.organizationId,
      storeId: input.storeId,
      orderId: input.orderId,
      orderVersion: result.orderVersion,
      placementId: input.placementId,
      finalizedAt: input.finalizedAt,
    });
    return result;
  }

  @TransactionalStep({
    txManager: (self: ConfirmOrderFromCheckoutPlacementWorkflow) => self.repository.txManager,
    bridge: (self: ConfirmOrderFromCheckoutPlacementWorkflow) =>
      self.repository.dbosTransactionBridge,
  })
  private commit(
    input: ConfirmOrderFromCheckoutPlacementV1Params,
  ): Promise<OrderCheckoutPlacementV1Result> {
    return this.repository.checkoutPlacement.confirm(input);
  }
}

@Injectable()
export class CancelOrderFromCheckoutPlacementWorkflow extends BrokerWorkflows<
  CancelOrderFromCheckoutPlacementV1Params,
  OrderCheckoutPlacementV1Result
> {
  constructor(
    @InjectBroker("order") broker: ServiceBroker,
    private readonly repository: Repository,
  ) {
    super(broker);
  }

  @Workflow("cancelOrderFromCheckoutPlacementV1", { idempotencyStrategy: "content" })
  async run(
    rawInput: CancelOrderFromCheckoutPlacementV1Params,
  ): Promise<OrderCheckoutPlacementV1Result> {
    const input = cancelOrderFromCheckoutPlacementV1Schema.parse(rawInput);
    const result = await this.commit(input);
    await emitPlacementEvent(this.broker, input, "orderPlacementFailed", {
      schemaVersion: 1,
      organizationId: input.organizationId,
      storeId: input.storeId,
      orderId: input.orderId,
      orderVersion: result.orderVersion,
      placementId: input.placementId,
      reasonCode: input.reasonCode,
      failedAt: input.failedAt,
    });
    return result;
  }

  @TransactionalStep({
    txManager: (self: CancelOrderFromCheckoutPlacementWorkflow) => self.repository.txManager,
    bridge: (self: CancelOrderFromCheckoutPlacementWorkflow) =>
      self.repository.dbosTransactionBridge,
  })
  private commit(
    input: CancelOrderFromCheckoutPlacementV1Params,
  ): Promise<OrderCheckoutPlacementV1Result> {
    return this.repository.checkoutPlacement.cancel(input);
  }
}

function emitPlacementEvent(
  broker: ServiceBroker,
  input: { organizationId: string; correlationId: string; orderId?: string; placementId: string },
  eventType: "orderPlaced" | "orderPlacementConfirmed" | "orderPlacementFailed",
  payload: Record<string, unknown>,
): Promise<EventEmitResult> {
  const workflowId = DBOS.workflowID;
  if (!workflowId) throw new Error("ORDER_PLACEMENT_WORKFLOW_CONTEXT_MISSING");
  const orderId = input.orderId ?? String(payload.orderId);
  return broker.runWorkflow<EventEmitResult>(
    "events.emit",
    {
      eventType,
      payload,
      context: { organizationId: input.organizationId, correlationId: input.correlationId },
      subject: { type: "order", id: orderId },
      actor: { type: "service" },
      emitKey: `order:${orderId}`,
    },
    {
      source: "workflow",
      organizationId: input.organizationId,
      workflowId,
      stepId: `emit:${eventType}`,
      callId: input.placementId,
    },
  );
}
