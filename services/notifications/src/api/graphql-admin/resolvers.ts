import { GraphQLScalarType, Kind, type ValueNode } from "graphql";
import type { ServiceContext } from "../../context/index.js";
import {
  NotificationAdminScript,
  type NotificationAdminParams,
} from "../../scripts/index.js";

type Args = Record<string, unknown>;

const run = (
  context: ServiceContext,
  params: NotificationAdminParams
) => context.kernel.runScript(NotificationAdminScript, params);

export const resolvers = {
  DateTime: new GraphQLScalarType({
    name: "DateTime",
    serialize: (value) =>
      value instanceof Date ? value.toISOString() : String(value),
    parseValue: (value) => String(value),
  }),
  JSON: new GraphQLScalarType({
    name: "JSON",
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral: (node) => parseLiteral(node),
  }),
  Query: {
    notificationsQuery: () => ({}),
  },
  Mutation: {
    notificationsMutation: () => ({}),
  },
  NotificationsQuery: {
    overview: (_: unknown, __: Args, context: ServiceContext) =>
      run(context, { operation: "overview" }),
    definitions: (_: unknown, __: Args, context: ServiceContext) =>
      run(context, { operation: "definitions" }),
    templateRevisions: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "templateRevisions",
        key: args.key as never,
        channel: args.channel as never,
        locale: args.locale as string,
      }),
    template: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "template",
        key: args.key as never,
        channel: args.channel as never,
        locale: args.locale as string,
      }),
    staffRecipients: (_: unknown, __: Args, context: ServiceContext) =>
      run(context, { operation: "staffRecipients" }),
    providerRoutes: (_: unknown, __: Args, context: ServiceContext) =>
      run(context, { operation: "providerRoutes" }),
    providerConfiguration: (
      _: unknown,
      args: Args,
      context: ServiceContext
    ) =>
      run(context, {
        operation: "providerConfiguration",
        channel: args.channel as never,
      }),
    webhookSubscriptions: (_: unknown, __: Args, context: ServiceContext) =>
      run(context, { operation: "webhooks" }),
    deliveries: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "deliveries",
        limit: args.limit as number | undefined,
      }),
    deliveryAttempts: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "deliveryAttempts",
        deliveryId: args.deliveryId as string,
      }),
  },
  NotificationsMutation: {
    setDefinitionEnabled: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "setDefinitionEnabled",
        key: args.key as never,
        enabled: args.enabled as boolean,
        expectedVersion: args.expectedVersion as number,
      }),
    setChannelEnabled: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "setChannelEnabled",
        ...(args.input as object),
      } as never),
    createTemplateRevision: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "createTemplateRevision",
        ...(args.input as object),
      } as never),
    activateTemplateRevision: (
      _: unknown,
      args: Args,
      context: ServiceContext
    ) =>
      run(context, {
        operation: "activateTemplateRevision",
        revisionId: args.revisionId as string,
        expectedVersion: args.expectedVersion as number,
      }),
    preview: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "preview",
        input: args.input as never,
      }),
    upsertStaffRecipient: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "upsertStaffRecipient",
        input: args.input as never,
      }),
    deleteStaffRecipient: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "deleteStaffRecipient",
        id: args.id as string,
      }),
    configureProvider: (_: unknown, args: Args, context: ServiceContext) => {
      const input = args.input as Record<string, unknown>;
      return run(context, {
        operation: "configureProvider",
        input: {
          providerCode: input.providerCode,
          channel: input.channel,
          config: input.config,
          secretFields: input.secretFields,
          status: input.active === false ? "inactive" : "active",
        },
      } as never);
    },
    testProvider: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "testProvider",
        channel: args.channel as never,
        recipient: args.recipient as string | undefined,
      }),
    sendTest: (_: unknown, args: Args, context: ServiceContext) => {
      const input = args.input as Record<string, unknown>;
      return run(context, {
        operation: "sendTest",
        input: {
          channel: input.channel,
          key: input.key,
          recipient: {
            recipientId: input.recipientId,
            customerId: input.customerId,
            userId: input.userId,
            email: input.email,
            phone: input.phone,
            name: input.name,
            locale: input.locale,
          },
          locale: input.locale,
          data: input.data,
          idempotencyKey: input.idempotencyKey,
        },
      } as never);
    },
    createWebhook: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "createWebhook",
        ...(args.input as object),
      } as never),
    updateWebhook: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "updateWebhook",
        ...(args.input as object),
      } as never),
    deleteWebhook: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, { operation: "deleteWebhook", id: args.id as string }),
    rotateWebhookSecret: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "rotateWebhookSecret",
        id: args.id as string,
        gracePeriodHours: args.gracePeriodHours as number | undefined,
      }),
    revealWebhookSecret: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "revealWebhookSecret",
        id: args.id as string,
      }),
    retryDelivery: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "retryDelivery",
        deliveryId: args.deliveryId as string,
        idempotencyKey: args.idempotencyKey as string,
      }),
    cancelDelivery: (_: unknown, args: Args, context: ServiceContext) =>
      run(context, {
        operation: "cancelDelivery",
        deliveryId: args.deliveryId as string,
      }),
  },
  NotificationDelivery: {
    id: (row: Record<string, unknown>) =>
      (row.delivery as Record<string, unknown>)?.id ?? row.id,
    occurrenceId: (row: Record<string, unknown>) =>
      (row.delivery as Record<string, unknown>)?.occurrenceId ??
      row.occurrenceId,
    channel: deliveryField("channel"),
    status: deliveryField("status"),
    purpose: deliveryField("purpose"),
    providerCode: deliveryField("providerCode"),
    providerMessageId: deliveryField("providerMessageId"),
    locale: deliveryField("locale"),
    attemptCount: deliveryField("attemptCount"),
    nextAttemptAt: deliveryField("nextAttemptAt"),
    lastErrorKind: deliveryField("lastErrorKind"),
    lastErrorCode: deliveryField("lastErrorCode"),
    createdAt: deliveryField("createdAt"),
    updatedAt: deliveryField("updatedAt"),
  },
};

function deliveryField(field: string) {
  return (row: Record<string, unknown>) =>
    (row.delivery as Record<string, unknown>)?.[field] ?? row[field];
}

function parseLiteral(node: ValueNode): unknown {
  switch (node.kind) {
    case Kind.STRING:
    case Kind.ENUM:
      return node.value;
    case Kind.INT:
      return Number.parseInt(node.value, 10);
    case Kind.FLOAT:
      return Number.parseFloat(node.value);
    case Kind.BOOLEAN:
      return node.value;
    case Kind.NULL:
      return null;
    case Kind.LIST:
      return node.values.map((value) => parseLiteral(value));
    case Kind.OBJECT:
      return Object.fromEntries(
        node.fields.map((field) => [
          field.name.value,
          parseLiteral(field.value),
        ])
      );
    default:
      return undefined;
  }
}
