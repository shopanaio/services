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

export function getDefinitionContract(
  key: NotificationDefinitionKey
): NotificationDefinitionContract {
  const contract = definitionContracts.get(key);
  if (!contract) {
    throw new Error(`Notification definition contract is missing for ${key}`);
  }
  return contract;
}
