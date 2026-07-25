import {
  NOTIFICATION_DEFINITION_KEYS,
  type NotificationAudience as DomainNotificationAudience,
  type NotificationChannel as DomainNotificationChannel,
  type NotificationDefinitionKey,
  type NotificationTemplateVariable,
} from "@shopana/broker-types";
import { KernelError } from "@shopana/shared-kernel";
import {
  GraphQLError,
  GraphQLScalarType,
  Kind,
  type ValueNode,
} from "graphql";
import type { ServiceContext } from "../../context/index.js";
import type { BaseScript } from "../../kernel/BaseScript.js";
import type { NotificationKernelServices } from "../../kernel/types.js";
import {
  NotificationChannelSetEnabledScript,
  NotificationChannelSettingsQueryScript,
  NotificationDefinitionSetEnabledScript,
  NotificationDefinitionsQueryScript,
  NotificationPreviewScript,
  NotificationProviderConfigurationQueryScript,
  NotificationProviderConfigureScript,
  NotificationProviderRoutesQueryScript,
  NotificationProviderTestScript,
  NotificationSendTestScript,
  NotificationTemplateQueryScript,
  NotificationTemplateUpdateScript,
  NotificationWebhookCapabilitiesQueryScript,
  NotificationWebhookCreateScript,
  NotificationWebhookDeleteScript,
  NotificationWebhookSecretRevealScript,
  NotificationWebhooksQueryScript,
  NotificationWebhookUpdateScript,
  StaffRecipientDeleteScript,
  StaffRecipientsQueryScript,
  StaffRecipientUpsertScript,
} from "../../scripts/index.js";
import {
  NotificationAudience,
  NotificationChannel,
  NotificationWebhookApiStability,
  NotificationWebhookFormat,
  NotificationWebhookStatus,
  type NotificationEffectiveTemplate,
  type NotificationTemplateVariable as GraphQLNotificationTemplateVariable,
  type NotificationWebhookSubscription,
  type NotificationsMutation,
  type NotificationsQuery,
  type Resolvers,
} from "./generated/types.js";

const notificationDefinitionKeys = new Set<string>(
  NOTIFICATION_DEFINITION_KEYS
);

const notificationsQueryRoot = {} as NotificationsQuery;
const notificationsMutationRoot = {} as NotificationsMutation;

export const resolvers: Resolvers = {
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
    notificationsQuery: () => notificationsQueryRoot,
  },
  Mutation: {
    notificationsMutation: () => notificationsMutationRoot,
  },
  NotificationsQuery: {
    definitions: async (_parent, _args, context) => {
      const definitions = await runAdminScript(
        context,
        NotificationDefinitionsQueryScript,
        {}
      );
      return definitions.map((definition) => ({
        ...definition,
        audience: toGraphQLAudience(definition.audience),
        allowedChannels: definition.allowedChannels.map(toGraphQLChannel),
        defaultChannels: definition.defaultChannels.map(toGraphQLChannel),
        activeChannels: definition.activeChannels.map(toGraphQLChannel),
        variables: definition.variables.map(toGraphQLTemplateVariable),
      }));
    },
    channelSettings: async (_parent, args, context) => {
      const settings = await runAdminScript(
        context,
        NotificationChannelSettingsQueryScript,
        { key: toDefinitionKey(args.key) }
      );
      return settings.map((setting) => ({
        ...setting,
        channel: toGraphQLChannel(setting.channel),
      }));
    },
    template: async (_parent, args, context) =>
      toGraphQLEffectiveTemplate(
        await runAdminScript(context, NotificationTemplateQueryScript, {
          key: toDefinitionKey(args.key),
          channel: toDomainChannel(args.channel),
          locale: args.locale,
        })
      ),
    staffRecipients: (_parent, _args, context) =>
      runAdminScript(context, StaffRecipientsQueryScript, {}),
    providerRoutes: async (_parent, _args, context) => {
      const routes = await runAdminScript(
        context,
        NotificationProviderRoutesQueryScript,
        {}
      );
      return routes.map((route) => ({
        ...route,
        channel: toGraphQLChannel(route.channel),
      }));
    },
    providerConfiguration: async (_parent, args, context) => {
      const configuration = await runAdminScript(
        context,
        NotificationProviderConfigurationQueryScript,
        { channel: toDomainChannel(args.channel) }
      );
      return {
        ...configuration,
        channel: toGraphQLChannel(configuration.channel),
      };
    },
    webhookCapabilities: async (_parent, _args, context) => {
      const capabilities = await runAdminScript(
        context,
        NotificationWebhookCapabilitiesQueryScript,
        {}
      );
      return {
        events: capabilities.events,
        apiVersions: capabilities.apiVersions.map((version) => ({
          ...version,
          stability: toGraphQLWebhookStability(version.stability),
        })),
      };
    },
    webhookSubscriptions: async (_parent, _args, context) =>
      (
        await runAdminScript(context, NotificationWebhooksQueryScript, {})
      ).map(toGraphQLWebhook),
  },
  NotificationsMutation: {
    setDefinitionEnabled: (_parent, args, context) =>
      runAdminScript(context, NotificationDefinitionSetEnabledScript, {
        key: toDefinitionKey(args.key),
        enabled: args.enabled,
        expectedVersion: args.expectedVersion,
      }),
    setChannelEnabled: async (_parent, args, context) => {
      const setting = await runAdminScript(
        context,
        NotificationChannelSetEnabledScript,
        {
          key: toDefinitionKey(args.input.key),
          channel: toDomainChannel(args.input.channel),
          enabled: args.input.enabled,
          expectedVersion: args.input.expectedVersion,
          senderName: optional(args.input.senderName),
          senderEmail: optional(args.input.senderEmail),
          replyTo: optional(args.input.replyTo),
        }
      );
      return {
        ...setting,
        channel: toGraphQLChannel(setting.channel),
      };
    },
    updateTemplate: async (_parent, args, context) =>
      toGraphQLEffectiveTemplate(
        await runAdminScript(context, NotificationTemplateUpdateScript, {
          key: toDefinitionKey(args.input.key),
          channel: toDomainChannel(args.input.channel),
          locale: args.input.locale,
          subjectTemplate: optional(args.input.subjectTemplate),
          bodyTemplate: args.input.bodyTemplate,
          plainTextTemplate: optional(args.input.plainTextTemplate),
          expectedVersion: args.input.expectedVersion,
        })
      ),
    preview: (_parent, args, context) =>
      runAdminScript(context, NotificationPreviewScript, {
        key: toDefinitionKey(args.input.key),
        channel: toDomainChannel(args.input.channel),
        locale: optional(args.input.locale),
        data: args.input.data,
        subjectTemplate: optional(args.input.subjectTemplate),
        bodyTemplate: optional(args.input.bodyTemplate),
        plainTextTemplate: optional(args.input.plainTextTemplate),
      }),
    upsertStaffRecipient: (_parent, args, context) =>
      runAdminScript(context, StaffRecipientUpsertScript, {
        id: optional(args.input.id),
        userId: optional(args.input.userId),
        name: args.input.name,
        email: args.input.email,
        locale: args.input.locale,
        timezone: args.input.timezone,
        enabled: args.input.enabled,
        eventKeys: args.input.eventKeys.map(toDefinitionKey),
      }),
    deleteStaffRecipient: (_parent, args, context) =>
      runAdminScript(context, StaffRecipientDeleteScript, { id: args.id }),
    configureProvider: async (_parent, args, context) => {
      const configuration = await runAdminScript(
        context,
        NotificationProviderConfigureScript,
        {
          providerCode: args.input.providerCode,
          channel: toDomainChannel(args.input.channel),
          config: args.input.config,
          secretFields: optionalStringRecord(args.input.secretFields),
          status: args.input.active === false ? "inactive" : "active",
        }
      );
      return {
        ...configuration,
        channel: toGraphQLChannel(configuration.channel),
      };
    },
    testProvider: (_parent, args, context) =>
      runAdminScript(context, NotificationProviderTestScript, {
        channel: toDomainChannel(args.channel),
        recipient: optional(args.recipient),
      }),
    sendTest: (_parent, args, context) =>
      runAdminScript(context, NotificationSendTestScript, {
        channel: toDomainChannel(args.input.channel),
        key: toDefinitionKey(args.input.key),
        recipient: {
          recipientId: optional(args.input.recipientId),
          customerId: optional(args.input.customerId),
          userId: optional(args.input.userId),
          email: optional(args.input.email),
          phone: optional(args.input.phone),
          name: optional(args.input.name),
          locale: optional(args.input.locale),
        },
        locale: optional(args.input.locale),
        data: args.input.data,
        idempotencyKey: args.input.idempotencyKey,
      }),
    createWebhook: async (_parent, args, context) =>
      toGraphQLWebhook(
        await runAdminScript(context, NotificationWebhookCreateScript, {
          eventType: args.input.eventType,
          format: toDomainWebhookFormat(args.input.format),
          url: args.input.url,
          apiVersion: args.input.apiVersion,
        })
      ),
    updateWebhook: async (_parent, args, context) =>
      toGraphQLWebhook(
        await runAdminScript(context, NotificationWebhookUpdateScript, {
          id: args.input.id,
          eventType: optional(args.input.eventType),
          format: args.input.format
            ? toDomainWebhookFormat(args.input.format)
            : undefined,
          url: optional(args.input.url),
          apiVersion: optional(args.input.apiVersion),
          status: args.input.status
            ? toDomainWebhookStatus(args.input.status)
            : undefined,
          expectedVersion: args.input.expectedVersion,
        })
      ),
    deleteWebhook: (_parent, args, context) =>
      runAdminScript(context, NotificationWebhookDeleteScript, {
        id: args.id,
      }),
    revealWebhookSecret: (_parent, _args, context) =>
      runAdminScript(context, NotificationWebhookSecretRevealScript, {}),
  },
};

async function runAdminScript<TParams, TResult>(
  context: ServiceContext,
  ScriptClass: new (
    services: NotificationKernelServices
  ) => BaseScript<TParams, TResult>,
  params: TParams
): Promise<TResult> {
  try {
    return await context.kernel.runScript(ScriptClass, params);
  } catch (error) {
    if (error instanceof KernelError) {
      throw new GraphQLError(error.message, {
        extensions: {
          code: error.code,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      });
    }
    throw new GraphQLError("Notification administration operation failed", {
      extensions: { code: "INTERNAL_ERROR" },
    });
  }
}

function toDefinitionKey(value: string): NotificationDefinitionKey {
  if (!notificationDefinitionKeys.has(value)) {
    throw new GraphQLError("Unknown notification definition", {
      extensions: {
        code: "INVALID_NOTIFICATION_DEFINITION",
        field: ["key"],
      },
    });
  }
  return value as NotificationDefinitionKey;
}

function toDomainChannel(value: NotificationChannel): DomainNotificationChannel {
  switch (value) {
    case NotificationChannel.Email:
      return "EMAIL";
    case NotificationChannel.Sms:
      return "SMS";
    case NotificationChannel.Webhook:
      return "WEBHOOK";
  }
}

function toGraphQLChannel(
  value: DomainNotificationChannel
): NotificationChannel {
  switch (value) {
    case "EMAIL":
      return NotificationChannel.Email;
    case "SMS":
      return NotificationChannel.Sms;
    case "WEBHOOK":
      return NotificationChannel.Webhook;
  }
}

function toGraphQLAudience(
  value: DomainNotificationAudience
): NotificationAudience {
  return value === "CUSTOMER"
    ? NotificationAudience.Customer
    : NotificationAudience.Staff;
}

function toDomainWebhookFormat(
  value: NotificationWebhookFormat
): "JSON" | "XML" {
  return value === NotificationWebhookFormat.Json ? "JSON" : "XML";
}

function toDomainWebhookStatus(
  value: NotificationWebhookStatus
): "ACTIVE" | "DISABLED" {
  return value === NotificationWebhookStatus.Active ? "ACTIVE" : "DISABLED";
}

function toGraphQLWebhook(
  webhook: {
    id: string;
    eventType: string;
    format: "JSON" | "XML";
    url: string;
    apiVersion: string;
    status: "ACTIVE" | "DISABLED";
    version: number;
    createdAt: string;
    updatedAt: string;
  }
): NotificationWebhookSubscription {
  return {
    ...webhook,
    format:
      webhook.format === "JSON"
        ? NotificationWebhookFormat.Json
        : NotificationWebhookFormat.Xml,
    status:
      webhook.status === "ACTIVE"
        ? NotificationWebhookStatus.Active
        : NotificationWebhookStatus.Disabled,
  };
}

function toGraphQLWebhookStability(
  value: "UNSTABLE" | "STABLE" | "DEPRECATED"
): NotificationWebhookApiStability {
  switch (value) {
    case "UNSTABLE":
      return NotificationWebhookApiStability.Unstable;
    case "STABLE":
      return NotificationWebhookApiStability.Stable;
    case "DEPRECATED":
      return NotificationWebhookApiStability.Deprecated;
  }
}

function toGraphQLEffectiveTemplate(
  template: Omit<NotificationEffectiveTemplate, "channel"> & {
    channel: DomainNotificationChannel;
  }
): NotificationEffectiveTemplate {
  return {
    ...template,
    channel: toGraphQLChannel(template.channel),
  };
}

function toGraphQLTemplateVariable(
  variable: NotificationTemplateVariable
): GraphQLNotificationTemplateVariable {
  return {
    path: variable.path,
    type: variable.type,
    required: variable.required,
    description: variable.description,
    children: variable.children?.map(toGraphQLTemplateVariable),
  };
}

function optional<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

function optionalStringRecord(
  value: Record<string, unknown> | null | undefined
): Record<string, string> | undefined {
  if (value === null || value === undefined) return undefined;
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string") {
      throw new GraphQLError("Provider secret fields must contain strings", {
        extensions: {
          code: "INVALID_INPUT",
          field: ["input", "secretFields", key],
        },
      });
    }
    result[key] = entry;
  }
  return result;
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
