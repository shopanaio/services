import { ApolloMutation, TypePolicy, ZodResolver } from "@shopana/type-resolver";
import { GlobalIdEntity, parseGlobalId } from "@shopana/shared-graphql-guid";
import type { ZodTypeAny } from "zod";
import type {
  AdminOrderCommandName,
  AdminOrderCommandResult,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import * as generatedSchemas from "../../interfaces/gql-admin-api/schemas.js";
import type { ApiOrdersMutationResolvers } from "../../interfaces/gql-admin-api/types.js";
import { toOrderUserErrors } from "../../interfaces/gql-admin-api/userErrors.js";
import { adminOrderCommandNames } from "../../domain/admin/AdminOrderCommandContracts.js";
import { OrderEditSessionResolver } from "./EditSessionResolver.js";
import { OrderOperationResolver } from "./OperationResolver.js";
import { OrderResolver } from "./OrderResolver.js";
import { OrdersType } from "./OrdersType.js";
import { decodeCommandInput, encodeId, stringValue, type Row } from "./values.js";

@ApolloMutation
export class MutationResolver extends OrdersType<Record<string, never>> {
  ordersMutation() {
    return new OrdersMutationResolver({}, this.$ctx);
  }
}

@OrderMutationBoundaries()
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
  orderExchangeComplete(args: CommandArgs) {
    return this.execute("orderExchangeComplete", args.input);
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
      const input = decodeCommandInput(command, rawInput);
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
    if (result.resourceId && command.startsWith("orderEdit")) {
      this.$ctx.loaders.editSession.clear(result.resourceId);
    }
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
    if (command === "orderCommentAdd") {
      const activity =
        result.orderId && resource
          ? await this.$ctx.repository.adminRead.activityEntry(
              this.$ctx.store.id,
              result.orderId,
              resource,
            )
          : null;
      return { ...base, activity: activity ? mapActivity(activity) : null };
    }
    if (command.startsWith("orderEdit"))
      return { ...base, edit: resource ? new OrderEditSessionResolver(resource, this.$ctx) : null };
    if (command.startsWith("orderLine")) {
      const row = order
        ? (await order.lines()).find((line) => decodeId(line.id) === resource)
        : null;
      return {
        ...base,
        line: row ?? null,
      };
    }
    if (command.startsWith("fulfillmentOrder")) {
      const row = order
        ? (await order.fulfillmentOrders()).find((item) => decodeId(item.id) === resource)
        : null;
      return {
        ...base,
        fulfillmentOrder: row ?? null,
      };
    }
    if (command === "fulfillmentCreate") {
      const fulfillment = order
        ? (await order.fulfillments()).find((item) => decodeId(item.id) === resource)
        : null;
      return {
        ...base,
        fulfillment: fulfillment ?? null,
      };
    }
    if (command.startsWith("shipment")) {
      const shipments = order ? await Promise.all(await order.shipments()) : [];
      const shipment = shipments.find((item) => decodeId(item.id) === resource) ?? null;
      return {
        ...base,
        shipment,
      };
    }
    if (command.startsWith("orderReturn")) {
      const connection = order ? await order.returns({ first: 100 }) : null;
      return {
        ...base,
        return: connection?.nodes.find((item) => decodeId(item.id) === resource) ?? null,
      };
    }
    if (command.startsWith("orderExchange")) {
      const connection = order ? await order.exchanges({ first: 100 }) : null;
      return {
        ...base,
        exchange: connection?.nodes.find((item) => decodeId(item.id) === resource) ?? null,
      };
    }
    return {
      ...base,
      clientMutationId: typeof input.clientMutationId === "string" ? input.clientMutationId : null,
    };
  }
}

type ResolverArgs<T> = T extends (...args: infer TArgs) => unknown
  ? TArgs[1]
  : T extends { resolve: infer TResolve }
    ? ResolverArgs<TResolve>
    : never;

type CommandArgs = ResolverArgs<
  NonNullable<ApiOrdersMutationResolvers[Exclude<keyof ApiOrdersMutationResolvers, "__isTypeOf">]>
>;

function boundarySchema(command: AdminOrderCommandName): ZodTypeAny {
  // GraphQL codegen is configured with `typesPrefix: "Api"`, therefore validation
  // schema factories are prefixed as well (for example ApiOrderCreateInputSchema).
  const exportName = `Api${command[0]!.toUpperCase()}${command.slice(1)}InputSchema`;
  const factory = (generatedSchemas as Record<string, unknown>)[exportName];
  if (typeof factory !== "function")
    throw new Error(`Missing GraphQL boundary schema ${exportName}`);
  return (factory as () => ZodTypeAny)();
}

function OrderMutationBoundaries(): ClassDecorator {
  return (target) => {
    const prototype = target.prototype as Record<string, unknown>;
    for (const command of adminOrderCommandNames) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, command);
      if (!descriptor || typeof descriptor.value !== "function") {
        throw new Error(`Missing Orders mutation resolver ${command}`);
      }
      ZodResolver(boundarySchema(command))(prototype, command, descriptor);
      const validated = descriptor.value as (
        this: OrdersMutationResolver,
        args: CommandArgs,
      ) => unknown;
      descriptor.value = async function (this: OrdersMutationResolver, args: CommandArgs) {
        const result = await validated.call(this, args);
        if (!isLibraryValidationFailure(result)) return result;
        return emptyPayload(
          command,
          result.userErrors.map((error) => ({
            field: error.field
              ? error.field[0] === "input"
                ? error.field
                : ["input", ...error.field]
              : ["input"],
            message: error.message,
            code: "ORDER_INPUT_INVALID",
            retryable: false,
          })),
        );
      };
      Object.defineProperty(prototype, command, descriptor);
    }
  };
}

function isLibraryValidationFailure(
  value: unknown,
): value is { userErrors: Array<{ code: string; message: string; field: string[] | null }> } {
  if (!value || typeof value !== "object") return false;
  const errors = (value as { userErrors?: unknown }).userErrors;
  return (
    Array.isArray(errors) &&
    errors.length > 0 &&
    errors.every(
      (error) =>
        Boolean(error) &&
        typeof error === "object" &&
        !("retryable" in (error as Record<string, unknown>)),
    )
  );
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

function encodeResource(command: AdminOrderCommandName, id: string): string | null {
  return encodeId(id, command === "orderDelete" ? GlobalIdEntity.Order : GlobalIdEntity.OrderLine);
}

function decodeId(id: string | null): string | null {
  if (!id) return null;
  try {
    return parseGlobalId(id).id;
  } catch {
    return null;
  }
}

function mapActivity(row: Row) {
  const storedActorType = stringValue(row, "actorType", "SYSTEM");
  const actorType = storedActorType === "STAFF" ? "USER" : storedActorType;
  const actorId = row.actorId == null ? null : String(row.actorId);
  const actorEntity =
    actorType === "API_KEY"
      ? GlobalIdEntity.ApiKey
      : actorType === "CUSTOMER"
        ? GlobalIdEntity.Customer
        : actorType === "APP"
          ? GlobalIdEntity.AppInstallation
          : GlobalIdEntity.User;
  const globalActorId = actorId ? encodeId(actorId, actorEntity) : null;
  return {
    id: encodeId(stringValue(row, "id"), GlobalIdEntity.OrderActivity),
    sequence: stringValue(row, "sequence"),
    type: stringValue(row, "activityType"),
    visibility: stringValue(row, "visibility"),
    message: stringValue(row, "message") || null,
    actor: {
      type: actorType,
      id: globalActorId,
      displayName: null,
      user:
        actorType === "USER" && globalActorId ? { __typename: "User", id: globalActorId } : null,
      apiKey:
        actorType === "API_KEY" && globalActorId
          ? { __typename: "ApiKey", id: globalActorId }
          : null,
    },
    data: row.payload ?? {},
    happenedAt: stringValue(row, "happenedAt"),
    recordedAt: stringValue(row, "recordedAt"),
  };
}
