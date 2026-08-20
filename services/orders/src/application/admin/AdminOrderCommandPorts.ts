import type {
  AdminOrderCommandInput,
  AdminOrderCommandName,
  AdminOrderCommandResult,
} from "../../domain/admin/AdminOrderCommandContracts.js";

export const ADMIN_ORDER_COMMAND_PERSISTENCE = Symbol("ADMIN_ORDER_COMMAND_PERSISTENCE");

export type MutableAdminOrderCommandResult = {
  orderId: string | null;
  orderVersion: number | null;
  resourceId: string | null;
  operationId: string | null;
  deleted?: boolean;
};

export type AdminOrderExternalEffect = Readonly<{
  route: string;
  params: Readonly<Record<string, unknown>>;
}>;

type Mutation = Promise<MutableAdminOrderCommandResult>;
type OrderStatus = "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";

export interface AdminOrderCommandPersistence {
  readonly draft: {
    createDraft(request: AdminOrderCommandInput): Mutation;
    updateDraftDetails(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    deleteDraft(request: AdminOrderCommandInput): Mutation;
    completeDraft(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    transition(
      request: AdminOrderCommandInput,
      command: AdminOrderCommandName,
      allowedStatuses: OrderStatus[],
      targetStatus: OrderStatus,
      timestamps: { placedAt?: boolean; closedAt?: boolean; clearClosedAt?: boolean },
    ): Mutation;
    archive(
      request: AdminOrderCommandInput,
      command: AdminOrderCommandName,
      archived: boolean,
    ): Mutation;
    setCustomer(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    updateTags(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    updateAdminNote(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    addComment(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    updateCustomFields(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    addDraftLine(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    updateDraftLine(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    deleteDraftLine(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
  };
  readonly edit: {
    beginEdit(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    appendEditChange(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    commitEdit(
      request: AdminOrderCommandInput,
      command: AdminOrderCommandName,
      workflowId: string,
    ): Mutation;
    abandonEdit(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
  };
  readonly payment: {
    recordManualPayment(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    overridePaymentStatus(
      request: AdminOrderCommandInput,
      command: AdminOrderCommandName,
    ): Mutation;
  };
  readonly fulfillment: {
    splitFulfillmentOrder(
      request: AdminOrderCommandInput,
      command: AdminOrderCommandName,
    ): Mutation;
    moveFulfillmentOrder(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    holdFulfillmentOrder(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    releaseFulfillmentHold(
      request: AdminOrderCommandInput,
      command: AdminOrderCommandName,
    ): Mutation;
    createFulfillment(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    updateShipmentTracking(
      request: AdminOrderCommandInput,
      command: AdminOrderCommandName,
    ): Mutation;
    markShipment(
      request: AdminOrderCommandInput,
      command: AdminOrderCommandName,
      status: "IN_TRANSIT" | "DELIVERED",
    ): Mutation;
  };
  readonly returns: {
    createReturn(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    transitionReturn(
      request: AdminOrderCommandInput,
      command: AdminOrderCommandName,
      targetStatus: "APPROVED" | "REJECTED" | "CANCELLED",
    ): Mutation;
    createExchange(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    cancelExchange(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
  };
  readonly integration: {
    detachIntegration(request: AdminOrderCommandInput, command: AdminOrderCommandName): Mutation;
    prepareOperation(
      request: AdminOrderCommandInput,
      command: AdminOrderCommandName,
      workflowId: string,
    ): Mutation;
  };
  readonly operation: {
    findReplay(
      storeId: string,
      command: AdminOrderCommandName,
      idempotencyKey: string,
    ): Promise<{ requestHash: string; response: AdminOrderCommandResult } | null>;
    saveReplay(
      storeId: string,
      command: AdminOrderCommandName,
      idempotencyKey: string,
      requestHash: string,
      response: AdminOrderCommandResult,
      orderId: string | null,
    ): Promise<void>;
  };
}
