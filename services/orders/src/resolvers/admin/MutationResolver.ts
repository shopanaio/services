import { ApolloMutation, TypePolicy } from "@shopana/type-resolver";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type {
  AdminOrderCommandName,
  AdminOrderCommandResult,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import * as generatedSchemas from "../../interfaces/gql-admin-api/schemas.js";
import { toOrderUserErrors } from "../../interfaces/gql-admin-api/userErrors.js";
import { adminOrderCommandNames } from "../../domain/admin/AdminOrderCommandContracts.js";
import { OrderEditSessionResolver } from "./EditSessionResolver.js";
import { mapFulfillmentOrder, mapLine } from "./entityMappers.js";
import { OrderOperationResolver } from "./OperationResolver.js";
import { OrderResolver } from "./OrderResolver.js";
import { OrdersType } from "./OrdersType.js";
import { decodeCommandInput, encodeId, rowsValue, stringValue, type Row } from "./values.js";

@ApolloMutation
export class MutationResolver extends OrdersType<Record<string, never>> {
  ordersMutation() {
    return new OrdersMutationResolver({}, this.$ctx);
  }
}

@TypePolicy<OrdersMutationResolver>({
  resource: "store.data",
  action: "write",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class OrdersMutationResolver extends OrdersType<Record<string, never>> {
  orderCreate(args: CommandArgs) {
    return this.execute("orderCreate", args.input);
  }
  orderUpdate(args: CommandArgs) {
    return this.execute("orderUpdate", args.input);
  }
  orderDelete(args: CommandArgs) {
    return this.execute("orderDelete", args.input);
  }
  orderCompleteDraft(args: CommandArgs) {
    return this.execute("orderCompleteDraft", args.input);
  }
  orderCancel(args: CommandArgs) {
    return this.execute("orderCancel", args.input);
  }
  orderClose(args: CommandArgs) {
    return this.execute("orderClose", args.input);
  }
  orderReopen(args: CommandArgs) {
    return this.execute("orderReopen", args.input);
  }
  orderArchive(args: CommandArgs) {
    return this.execute("orderArchive", args.input);
  }
  orderUnarchive(args: CommandArgs) {
    return this.execute("orderUnarchive", args.input);
  }
  orderCustomerSet(args: CommandArgs) {
    return this.execute("orderCustomerSet", args.input);
  }
  orderTagsUpdate(args: CommandArgs) {
    return this.execute("orderTagsUpdate", args.input);
  }
  orderAdminNoteUpdate(args: CommandArgs) {
    return this.execute("orderAdminNoteUpdate", args.input);
  }
  orderCommentAdd(args: CommandArgs) {
    return this.execute("orderCommentAdd", args.input);
  }
  orderCustomFieldsUpdate(args: CommandArgs) {
    return this.execute("orderCustomFieldsUpdate", args.input);
  }
  orderLineAdd(args: CommandArgs) {
    return this.execute("orderLineAdd", args.input);
  }
  orderLineUpdate(args: CommandArgs) {
    return this.execute("orderLineUpdate", args.input);
  }
  orderLineDelete(args: CommandArgs) {
    return this.execute("orderLineDelete", args.input);
  }
  orderEditBegin(args: CommandArgs) {
    return this.execute("orderEditBegin", args.input);
  }
  orderEditLineAdd(args: CommandArgs) {
    return this.execute("orderEditLineAdd", args.input);
  }
  orderEditLineUpdate(args: CommandArgs) {
    return this.execute("orderEditLineUpdate", args.input);
  }
  orderEditLineRemove(args: CommandArgs) {
    return this.execute("orderEditLineRemove", args.input);
  }
  orderEditShippingUpdate(args: CommandArgs) {
    return this.execute("orderEditShippingUpdate", args.input);
  }
  orderEditDiscountAdd(args: CommandArgs) {
    return this.execute("orderEditDiscountAdd", args.input);
  }
  orderEditDiscountRemove(args: CommandArgs) {
    return this.execute("orderEditDiscountRemove", args.input);
  }
  orderEditCommit(args: CommandArgs) {
    return this.execute("orderEditCommit", args.input);
  }
  orderEditAbandon(args: CommandArgs) {
    return this.execute("orderEditAbandon", args.input);
  }
  orderManualPaymentRecord(args: CommandArgs) {
    return this.execute("orderManualPaymentRecord", args.input);
  }
  orderPaymentCapture(args: CommandArgs) {
    return this.execute("orderPaymentCapture", args.input);
  }
  orderPaymentVoid(args: CommandArgs) {
    return this.execute("orderPaymentVoid", args.input);
  }
  orderPaymentRetry(args: CommandArgs) {
    return this.execute("orderPaymentRetry", args.input);
  }
  orderRefundCreate(args: CommandArgs) {
    return this.execute("orderRefundCreate", args.input);
  }
  orderPaymentStatusOverride(args: CommandArgs) {
    return this.execute("orderPaymentStatusOverride", args.input);
  }
  fulfillmentOrderSplit(args: CommandArgs) {
    return this.execute("fulfillmentOrderSplit", args.input);
  }
  fulfillmentOrderMove(args: CommandArgs) {
    return this.execute("fulfillmentOrderMove", args.input);
  }
  fulfillmentOrderHold(args: CommandArgs) {
    return this.execute("fulfillmentOrderHold", args.input);
  }
  fulfillmentOrderReleaseHold(args: CommandArgs) {
    return this.execute("fulfillmentOrderReleaseHold", args.input);
  }
  fulfillmentOrderSubmit(args: CommandArgs) {
    return this.execute("fulfillmentOrderSubmit", args.input);
  }
  fulfillmentOrderCancelRequest(args: CommandArgs) {
    return this.execute("fulfillmentOrderCancelRequest", args.input);
  }
  fulfillmentCreate(args: CommandArgs) {
    return this.execute("fulfillmentCreate", args.input);
  }
  fulfillmentCancel(args: CommandArgs) {
    return this.execute("fulfillmentCancel", args.input);
  }
  shipmentCreate(args: CommandArgs) {
    return this.execute("shipmentCreate", args.input);
  }
  shipmentTrackingUpdate(args: CommandArgs) {
    return this.execute("shipmentTrackingUpdate", args.input);
  }
  shipmentMarkShipped(args: CommandArgs) {
    return this.execute("shipmentMarkShipped", args.input);
  }
  shipmentMarkDelivered(args: CommandArgs) {
    return this.execute("shipmentMarkDelivered", args.input);
  }
  shipmentCancel(args: CommandArgs) {
    return this.execute("shipmentCancel", args.input);
  }
  shipmentReconcile(args: CommandArgs) {
    return this.execute("shipmentReconcile", args.input);
  }
  orderReturnCreate(args: CommandArgs) {
    return this.execute("orderReturnCreate", args.input);
  }
  orderReturnApprove(args: CommandArgs) {
    return this.execute("orderReturnApprove", args.input);
  }
  orderReturnReject(args: CommandArgs) {
    return this.execute("orderReturnReject", args.input);
  }
  orderReturnCancel(args: CommandArgs) {
    return this.execute("orderReturnCancel", args.input);
  }
  orderReturnReceive(args: CommandArgs) {
    return this.execute("orderReturnReceive", args.input);
  }
  orderExchangeCreate(args: CommandArgs) {
    return this.execute("orderExchangeCreate", args.input);
  }
  orderExchangeCancel(args: CommandArgs) {
    return this.execute("orderExchangeCancel", args.input);
  }
  orderIntegrationSyncRequest(args: CommandArgs) {
    return this.execute("orderIntegrationSyncRequest", args.input);
  }
  orderIntegrationSyncRetry(args: CommandArgs) {
    return this.execute("orderIntegrationSyncRetry", args.input);
  }
  orderIntegrationLinkDetach(args: CommandArgs) {
    return this.execute("orderIntegrationLinkDetach", args.input);
  }
  ordersBulkAction(args: CommandArgs) {
    return this.execute("ordersBulkAction", args.input);
  }

  private async execute(command: AdminOrderCommandName, rawInput: unknown) {
    const fallbackCode = `${command.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()}_FAILED`;
    try {
      const parsed = parseBoundaryInput(command, rawInput);
      const input = decodeCommandInput(command, parsed);
      const result = await this.$ctx.broker.call<AdminOrderCommandResult, Record<string, unknown>>(
        `order.${command}`,
        input,
        { adminContext: this.$ctx.adminContext },
      );
      return await this.payload(command, result, input);
    } catch (error) {
      return emptyPayload(command, toOrderUserErrors(error, fallbackCode));
    }
  }

  private async payload(
    command: AdminOrderCommandName,
    result: AdminOrderCommandResult,
    input: Row,
  ) {
    if (result.orderId) this.$ctx.loaders.order.clear(result.orderId);
    if (result.operationId) this.$ctx.loaders.operation.clear(result.operationId);
    const order =
      result.orderId && !result.deleted ? new OrderResolver(result.orderId, this.$ctx) : null;
    const resource = result.resourceId;
    const base: Record<string, unknown> = { order, userErrors: [] };
    if (command === "orderDelete" || command === "orderLineDelete") {
      return {
        ...base,
        deletedId: resource
          ? encodeResource(command, resource)
          : encodeId(
              input.id ?? input.lineId,
              command === "orderDelete" ? GlobalIdEntity.Order : GlobalIdEntity.OrderLine,
            ),
      };
    }
    if (result.operationId)
      return { ...base, operation: new OrderOperationResolver(result.operationId, this.$ctx) };
    if (command === "orderCommentAdd") return { ...base, activity: null };
    const detail = result.orderId ? await this.$ctx.loaders.order.load(result.orderId) : null;
    if (command.startsWith("orderEdit"))
      return { ...base, edit: resource ? new OrderEditSessionResolver(resource, this.$ctx) : null };
    if (command.startsWith("orderLine")) {
      const row = findResource(detail, "lines", resource);
      return {
        ...base,
        line: row && detail ? mapLine(row, stringValue(detail, "currencyCode")) : null,
      };
    }
    if (command.startsWith("fulfillmentOrder")) {
      const row = findResource(detail, "fulfillmentOrders", resource);
      return {
        ...base,
        fulfillmentOrder:
          row && result.orderId
            ? mapFulfillmentOrder(row, encodeId(result.orderId, GlobalIdEntity.Order)!)
            : null,
      };
    }
    if (command === "fulfillmentCreate")
      return {
        ...base,
        fulfillment: resource ? { id: encodeId(resource, GlobalIdEntity.Fulfillment) } : null,
      };
    if (command.startsWith("shipment"))
      return {
        ...base,
        shipment: resource ? { id: encodeId(resource, GlobalIdEntity.Shipment) } : null,
      };
    if (command.startsWith("orderReturn"))
      return {
        ...base,
        return: resource ? { id: encodeId(resource, GlobalIdEntity.OrderReturn) } : null,
      };
    if (command.startsWith("orderExchange"))
      return {
        ...base,
        exchange: resource ? { id: encodeId(resource, GlobalIdEntity.OrderExchange) } : null,
      };
    return {
      ...base,
      clientMutationId: typeof input.clientMutationId === "string" ? input.clientMutationId : null,
    };
  }
}

type CommandArgs = { input: unknown };

function parseBoundaryInput(command: AdminOrderCommandName, input: unknown): unknown {
  const exportName = `${command[0]!.toUpperCase()}${command.slice(1)}InputSchema`;
  const factory = (generatedSchemas as Record<string, unknown>)[exportName];
  if (typeof factory !== "function")
    throw new Error(`Missing GraphQL boundary schema ${exportName}`);
  return (factory as () => { parse(value: unknown): unknown })().parse(input);
}

function emptyPayload(command: AdminOrderCommandName, userErrors: unknown[]) {
  const payload: Record<string, unknown> = { order: null, userErrors };
  if (command === "orderDelete" || command === "orderLineDelete") payload.deletedId = null;
  else if (command.startsWith("orderEdit")) payload.edit = null;
  else if (command.startsWith("orderLine")) payload.line = null;
  else if (command === "orderCommentAdd") payload.activity = null;
  else if (command.startsWith("fulfillmentOrder")) payload.fulfillmentOrder = null;
  else if (command === "fulfillmentCreate") payload.fulfillment = null;
  else if (command.startsWith("shipment")) payload.shipment = null;
  else if (command.startsWith("orderReturn")) payload.return = null;
  else if (command.startsWith("orderExchange")) payload.exchange = null;
  else if (operationCommands.has(command)) payload.operation = null;
  return payload;
}

const operationCommands = new Set(
  adminOrderCommandNames.filter((command) =>
    [
      "orderCancel",
      "orderEditCommit",
      "orderManualPaymentRecord",
      "orderPaymentCapture",
      "orderPaymentVoid",
      "orderPaymentRetry",
      "orderRefundCreate",
      "fulfillmentOrderSubmit",
      "fulfillmentOrderCancelRequest",
      "fulfillmentCancel",
      "shipmentCreate",
      "shipmentCancel",
      "shipmentReconcile",
      "orderReturnReceive",
      "orderIntegrationSyncRequest",
      "orderIntegrationSyncRetry",
      "ordersBulkAction",
    ].includes(command),
  ),
);

function findResource(detail: Row | null, field: string, resourceId: string | null): Row | null {
  return detail && resourceId
    ? (rowsValue(detail, field).find((row) => stringValue(row, "id") === resourceId) ?? null)
    : null;
}

function encodeResource(command: AdminOrderCommandName, id: string): string | null {
  return encodeId(id, command === "orderDelete" ? GlobalIdEntity.Order : GlobalIdEntity.OrderLine);
}
