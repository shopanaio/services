import type {
  NotificationDefinitionKey,
  NotificationTemplateVariable,
} from "@shopana/broker-types";
import { NOTIFICATION_DEFINITION_KEYS } from "@shopana/broker-types";
import { z } from "zod";

export interface NotificationDefinitionContract {
  dataSchema: z.ZodType<Record<string, unknown>>;
  variables: readonly NotificationTemplateVariable[];
}

/**
 * Per-definition contract placeholders.
 *
 * Each notification key intentionally owns a distinct schema and variable
 * collection so contracts can be refined independently as producer payloads
 * are formalized.
 */
const definitionContracts = new Map<
  NotificationDefinitionKey,
  NotificationDefinitionContract
>(
  NOTIFICATION_DEFINITION_KEYS.map((key) => [
    key,
    {
      dataSchema: z
        .record(z.unknown())
        .describe(`TODO: define notification data contract for ${key}`),
      variables: [
        {
          path: "*",
          type: "STRING",
          required: false,
          description: `TODO: catalogue template variables for ${key}`,
        },
      ],
    } satisfies NotificationDefinitionContract,
  ])
);

const applicationAuthEnvelopeSchema = z.object({
  store: z.object({
    id: z.string().uuid(),
    displayName: z.string().min(1),
    defaultLocale: z.string().min(1),
    timezone: z.string().min(1),
  }),
  application: z.object({
    id: z.string().uuid(),
  }),
});

definitionContracts.set("customer.auth.email_verification", {
  dataSchema: applicationAuthEnvelopeSchema.extend({
    authentication: z.object({
      url: z.string().url(),
    }),
  }),
  variables: applicationAuthVariables({
    path: "authentication.url",
    type: "URL",
    description: "Application email verification URL",
  }),
});

definitionContracts.set("customer.auth.login_code", {
  dataSchema: applicationAuthEnvelopeSchema.extend({
    authentication: z.object({
      otp: z.string().regex(/^\d{6}$/u),
    }),
  }),
  variables: applicationAuthVariables({
    path: "authentication.otp",
    type: "STRING",
    description: "Six-digit application sign-in code",
  }),
});

definitionContracts.set("customer.auth.password_reset", {
  dataSchema: applicationAuthEnvelopeSchema.extend({
    authentication: z.object({
      url: z.string().url(),
    }),
  }),
  variables: applicationAuthVariables({
    path: "authentication.url",
    type: "URL",
    description: "Application password reset URL",
  }),
});

export function getDefinitionContract(
  key: NotificationDefinitionKey
): NotificationDefinitionContract {
  const contract = definitionContracts.get(key);
  if (!contract) {
    throw new Error(`Notification definition contract is missing for ${key}`);
  }
  return contract;
}

function applicationAuthVariables(
  credential: Omit<NotificationTemplateVariable, "required">
): readonly NotificationTemplateVariable[] {
  return [
    {
      path: "store.displayName",
      type: "STRING",
      required: true,
      description: "Store display name",
    },
    {
      path: "application.id",
      type: "STRING",
      required: true,
      description: "Application authentication realm identifier",
    },
    {
      ...credential,
      required: true,
    },
  ];
}
