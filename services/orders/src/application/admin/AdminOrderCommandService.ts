import { Inject, Injectable } from "@nestjs/common";
import {
  asynchronousAdminOrderCommands,
  type AdminOrderCommandInput,
  type AdminOrderCommandName,
  type AdminOrderCommandResult,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import {
  ADMIN_ORDER_COMMAND_PERSISTENCE,
  type AdminOrderCommandPersistence,
  type MutableAdminOrderCommandResult,
} from "./AdminOrderCommandPorts.js";
import {
  adminOrderIdempotencyKey,
  adminOrderRequestDigest,
} from "./AdminOrderCommandIdempotency.js";
import { parseAdminOrderBulkSelection } from "./AdminOrderBulkSelection.js";

/**
 * Application-layer dispatcher for Admin order commands.
 *
 * Workflows own durable orchestration, this service owns command selection and
 * idempotency semantics, and capability repositories only persist the selected
 * aggregate changes.
 */
@Injectable()
export class AdminOrderCommandService {
  constructor(
    @Inject(ADMIN_ORDER_COMMAND_PERSISTENCE)
    private readonly persistence: AdminOrderCommandPersistence,
  ) {}

  async execute(
    command: AdminOrderCommandName,
    request: AdminOrderCommandInput,
    workflowId: string,
  ): Promise<AdminOrderCommandResult> {
    if (command === "ordersBulkAction") parseAdminOrderBulkSelection(request.input);
    const idempotencyKey = adminOrderIdempotencyKey(request.input);
    const requestHash = adminOrderRequestDigest({ command, input: request.input });
    const replay = await this.persistence.operation.findReplay(
      request.context.storeId,
      command,
      idempotencyKey,
    );
    if (replay) {
      if (replay.requestHash !== requestHash) {
        throw new Error("IDEMPOTENCY_KEY_PARAMETER_MISMATCH");
      }
      return { ...replay.response, duplicate: true };
    }

    const mutation = await this.dispatch(command, request, workflowId);
    const result: AdminOrderCommandResult = {
      command,
      orderId: mutation.orderId,
      orderVersion: mutation.orderVersion,
      resourceId: mutation.resourceId,
      operationId: mutation.operationId,
      duplicate: false,
      deleted: mutation.deleted ?? false,
    };
    await this.persistence.operation.saveReplay(
      request.context.storeId,
      command,
      idempotencyKey,
      requestHash,
      result,
      mutation.orderId,
    );
    return result;
  }

  private dispatch(
    command: AdminOrderCommandName,
    request: AdminOrderCommandInput,
    workflowId: string,
  ): Promise<MutableAdminOrderCommandResult> {
    const { draft, edit, payment, fulfillment, returns, integration } = this.persistence;
    switch (command) {
      case "orderCreate":
        return draft.createDraft(request);
      case "orderUpdate":
        return draft.updateDraftDetails(request, command);
      case "orderDelete":
        return draft.deleteDraft(request);
      case "orderCompleteDraft":
        return draft.completeDraft(request, command);
      case "orderClose":
        return draft.transition(request, command, ["OPEN"], "CLOSED", { closedAt: true });
      case "orderReopen":
        return draft.transition(request, command, ["CLOSED"], "OPEN", { clearClosedAt: true });
      case "orderArchive":
        return draft.archive(request, command, true);
      case "orderUnarchive":
        return draft.archive(request, command, false);
      case "orderCustomerSet":
        return draft.setCustomer(request, command);
      case "orderTagsUpdate":
        return draft.updateTags(request, command);
      case "orderAdminNoteUpdate":
        return draft.updateAdminNote(request, command);
      case "orderCommentAdd":
        return draft.addComment(request, command);
      case "orderCustomFieldsUpdate":
        return draft.updateCustomFields(request, command);
      case "orderLineAdd":
        return draft.addDraftLine(request, command);
      case "orderLineUpdate":
        return draft.updateDraftLine(request, command);
      case "orderLineDelete":
        return draft.deleteDraftLine(request, command);
      case "orderEditBegin":
        return edit.beginEdit(request, command);
      case "orderEditLineAdd":
      case "orderEditLineUpdate":
      case "orderEditLineRemove":
      case "orderEditShippingUpdate":
      case "orderEditDiscountAdd":
      case "orderEditDiscountRemove":
        return edit.appendEditChange(request, command);
      case "orderEditCommit":
        return edit.commitEdit(request, command, workflowId);
      case "orderEditAbandon":
        return edit.abandonEdit(request, command);
      case "orderManualPaymentRecord":
        return payment.recordManualPayment(request, command);
      case "orderPaymentStatusOverride":
        return payment.overridePaymentStatus(request, command);
      case "fulfillmentOrderSplit":
        return fulfillment.splitFulfillmentOrder(request, command);
      case "fulfillmentOrderMove":
        return fulfillment.moveFulfillmentOrder(request, command);
      case "fulfillmentOrderHold":
        return fulfillment.holdFulfillmentOrder(request, command);
      case "fulfillmentOrderReleaseHold":
        return fulfillment.releaseFulfillmentHold(request, command);
      case "fulfillmentCreate":
        return fulfillment.createFulfillment(request, command);
      case "shipmentTrackingUpdate":
        return fulfillment.updateShipmentTracking(request, command);
      case "shipmentMarkShipped":
        return fulfillment.markShipment(request, command, "IN_TRANSIT");
      case "shipmentMarkDelivered":
        return fulfillment.markShipment(request, command, "DELIVERED");
      case "orderReturnCreate":
        return returns.createReturn(request, command);
      case "orderReturnApprove":
        return returns.transitionReturn(request, command, "APPROVED");
      case "orderReturnReject":
        return returns.transitionReturn(request, command, "REJECTED");
      case "orderReturnCancel":
        return returns.transitionReturn(request, command, "CANCELLED");
      case "orderExchangeCreate":
        return returns.createExchange(request, command);
      case "orderExchangeCancel":
        return returns.cancelExchange(request, command);
      case "orderIntegrationLinkDetach":
        return integration.detachIntegration(request, command);
      default:
        if (asynchronousAdminOrderCommands.has(command)) {
          return integration.prepareOperation(request, command, workflowId);
        }
        throw new Error(`ORDER_COMMAND_NOT_IMPLEMENTED:${command}`);
    }
  }
}
