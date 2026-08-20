import type {
  NotificationChannel,
  NotificationDefinitionKey,
  NotificationPurpose,
  NotificationRecipientSnapshot,
} from "@shopana/broker-types";
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";

export interface MaterializeNotificationParams {
  storeId: string;
  organizationId: string;
  key: NotificationDefinitionKey;
  sourceEventId?: string;
  sourceEventType?: string;
  includeEventWebhooks?: boolean;
  sourceService: string;
  sourceIdempotencyKey: string;
  subject: { type: string; id: string };
  correlationId: string;
  recipients?: readonly NotificationRecipientSnapshot[];
  locale?: string;
  data: Record<string, unknown>;
  purpose?: NotificationPurpose;
  forcedChannels?: readonly NotificationChannel[];
}

export interface MaterializeNotificationResult {
  occurrenceId?: string;
  deliveryIds: string[];
  deduplicated: boolean;
  skippedReason?: "DISABLED" | "NO_RECIPIENT";
}

export class MaterializeNotificationScript extends BaseScript<
  MaterializeNotificationParams,
  MaterializeNotificationResult
> {
  @Transactional()
  protected async execute(
    params: MaterializeNotificationParams,
  ): Promise<MaterializeNotificationResult> {
    if (params.storeId !== this.context.store.id) {
      throw new Error("STORE_CONTEXT_MISMATCH");
    }
    const definition = this.definitions.get(params.key);
    definition.dataSchema.parse(params.data);

    const definitionSetting = await this.repository.settings.getDefinitionSetting(params.key);
    const enabled = definition.optional ? (definitionSetting?.enabled ?? false) : true;
    if (!enabled && params.purpose !== "TEST") {
      return {
        deliveryIds: [],
        deduplicated: false,
        skippedReason: "DISABLED",
      };
    }

    let recipients = [...(params.recipients ?? [])];
    if (definition.recipientPolicy === "STAFF_CONFIGURATION") {
      recipients = await this.repository.staff.resolveRecipients(params.key);
    }

    const channels = await this.resolveChannels(params);
    const targets: Array<{
      recipient: NotificationRecipientSnapshot;
      channels: readonly NotificationChannel[];
    }> = recipients.map((recipient) => ({ recipient, channels }));

    if (params.includeEventWebhooks && params.sourceEventType && params.purpose !== "TEST") {
      const subscriptions = await this.repository.webhooks.listActiveForEvent(
        params.sourceEventType,
      );
      targets.push(
        ...subscriptions.map((subscription) => ({
          recipient: {
            recipientId: subscription.id,
            locale: params.locale,
            name: `Webhook ${subscription.eventType}`,
          },
          channels: ["WEBHOOK" as const],
        })),
      );
    }

    const materialized = await this.repository.deliveries.materialize({
      organizationId: params.organizationId,
      definitionKey: params.key,
      sourceEventId: params.sourceEventId,
      sourceEventType: params.sourceEventType,
      sourceService: params.sourceService,
      sourceIdempotencyKey: params.sourceIdempotencyKey,
      subject: params.subject,
      correlationId: params.correlationId,
      data: params.data,
      recipients,
      channels,
      targets,
      purpose: params.purpose ?? "BUSINESS",
      locale: params.locale,
    });
    return {
      ...materialized,
      skippedReason: targets.length === 0 ? ("NO_RECIPIENT" as const) : undefined,
    };
  }

  private async resolveChannels(
    params: MaterializeNotificationParams,
  ): Promise<NotificationChannel[]> {
    const definition = this.definitions.get(params.key);
    if (params.forcedChannels) {
      for (const channel of params.forcedChannels) {
        if (!definition.allowedChannels.includes(channel)) {
          throw new Error(`CHANNEL_NOT_ALLOWED:${channel}`);
        }
      }
      return [...new Set(params.forcedChannels)];
    }

    const settings = await this.repository.settings.listChannelSettings(params.key);
    return definition.allowedChannels.filter((channel) => {
      const configured = settings.find((entry) => entry.channel === channel);
      return configured?.enabled ?? definition.defaultChannels.includes(channel);
    });
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
