import { createHash } from "node:crypto";
import type {
  EmailDeliveryInput,
  NotificationDeliveryInput,
  NotificationDeliveryReceipt,
  SmsDeliveryInput,
  WebhookDeliveryInput,
} from "@shopana/broker-types";
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";

export type DeliveryExecutionParams =
  | { operation: "claimAndRender"; deliveryId: string }
  | {
      operation: "createAttempt";
      deliveryId: string;
      workflowId: string;
      providerCode?: string;
      providerSlotId?: string;
    }
  | {
      operation: "recordAttemptSuccess";
      attemptId: string;
      receipt: NotificationDeliveryReceipt & {
        state: "ACCEPTED" | "DELIVERED";
      };
    }
  | {
      operation: "recordAttemptFailure";
      attemptId: string;
      errorKind: string;
      errorCode?: string;
      providerMessageId?: string;
      diagnostics?: Record<string, unknown>;
      retry?: {
        nextAttemptAt: string;
      };
    }
  | {
      operation: "resumeProviderRetry";
      attemptId: string;
    }
  | {
      operation: "finalizeSuccess";
      deliveryId: string;
      state: "ACCEPTED" | "DELIVERED";
      providerCode?: string;
      providerSlotId?: string;
      providerMessageId?: string;
    }
  | {
      operation: "finalizeFailure";
      deliveryId: string;
      status:
        | "UNKNOWN"
        | "FAILED_PERMANENT"
        | "DEAD"
        | "BLOCKED_NO_PROVIDER";
      errorKind: string;
      errorCode?: string;
      providerCode?: string;
      providerSlotId?: string;
      providerMessageId?: string;
    }
  | {
      operation: "recordPreflightFailure";
      deliveryId: string;
      errorKind: string;
      errorCode: string;
    };

export type DeliveryExecutionResult =
  | { claimed: false }
  | {
      claimed: true;
      channel: NotificationDeliveryInput["channel"];
      input: NotificationDeliveryInput;
    }
  | { attemptId: string; attemptNumber: number }
  | { success: boolean };

export class DeliveryExecutionScript extends BaseScript<
  DeliveryExecutionParams,
  DeliveryExecutionResult
> {
  @Transactional()
  protected async execute(
    params: DeliveryExecutionParams
  ): Promise<DeliveryExecutionResult> {
    switch (params.operation) {
      case "claimAndRender":
        return this.claimAndRender(params.deliveryId);
      case "createAttempt": {
        const result = await this.repository.deliveries.createAttempt(params);
        return { attemptId: result.id, attemptNumber: result.attemptNumber };
      }
      case "recordAttemptSuccess":
        await this.repository.deliveries.recordAttemptSuccess({
          attemptId: params.attemptId,
          state:
            params.receipt.state === "DELIVERED" ? "DELIVERED" : "ACCEPTED",
          providerMessageId: params.receipt.providerMessageId,
          responseCode: params.receipt.responseCode,
        });
        return { success: true };
      case "recordAttemptFailure":
        await this.repository.deliveries.recordAttemptFailure(params);
        return { success: true };
      case "resumeProviderRetry":
        await this.repository.deliveries.resumeProviderRetry(params.attemptId);
        return { success: true };
      case "finalizeSuccess":
        await this.repository.deliveries.finalizeSuccess(params);
        return { success: true };
      case "finalizeFailure":
        await this.repository.deliveries.finalizeFailure(params);
        return { success: true };
      case "recordPreflightFailure":
        await this.repository.deliveries.recordPreflightFailure(params);
        return { success: true };
    }
  }

  private async claimAndRender(
    deliveryId: string
  ): Promise<DeliveryExecutionResult> {
    const bundle = await this.repository.deliveries.claim(deliveryId);
    if (!bundle) return { claimed: false };
    const channel = bundle.delivery.channel;
    const base = {
      deliveryId,
      idempotencyKey: bundle.delivery.idempotencyKey,
      storeId: bundle.delivery.storeId,
      notificationKey:
        bundle.occurrence
          .definitionKey as NotificationDeliveryInput["notificationKey"],
      correlationId: bundle.occurrence.correlationId,
      metadata: {
        eventId: bundle.occurrence.sourceEventId ?? undefined,
        locale: bundle.delivery.locale ?? undefined,
      },
    };

    if (channel === "WEBHOOK") {
      const subscriptionId = bundle.recipient.recipientRef;
      if (!subscriptionId) throw new Error("WEBHOOK_SUBSCRIPTION_NOT_FOUND");
      const subscription = await this.repository.webhooks.find(subscriptionId);
      if (!subscription || subscription.status !== "ACTIVE") {
        throw new Error("WEBHOOK_SUBSCRIPTION_NOT_FOUND");
      }
      const createdAt = new Date().toISOString();
      const envelope = {
        id: deliveryId,
        eventId: bundle.occurrence.sourceEventId,
        type: bundle.occurrence.sourceEventType,
        apiVersion: subscription.apiVersion,
        createdAt,
        storeId: bundle.delivery.storeId,
        data: bundle.data,
      };
      const body =
        subscription.format === "JSON"
          ? JSON.stringify(envelope)
          : toXml(envelope);
      const signature = await this.repository.webhooks.sign(
        createdAt,
        deliveryId,
        body
      );
      const input: WebhookDeliveryInput = {
        ...base,
        channel: "WEBHOOK",
        url: subscription.url,
        method: "POST",
        headers: {
          "x-shopana-timestamp": createdAt,
          "x-shopana-signature": `v1=${signature}`,
          "x-shopana-signature-version": "v1",
          "x-shopana-delivery-id": deliveryId,
        },
        body,
        contentType:
          subscription.format === "JSON"
            ? "application/json"
            : "application/xml",
      };
      await this.recordRendered(bundle, {
        text: body,
        locale: bundle.delivery.locale ?? "en",
        contentHash: hash(body),
        templateSourceVersion: `webhook-${subscription.apiVersion}`,
      });
      return { claimed: true, channel, input };
    }

    const rendered = await this.renderer.render({
      key: base.notificationKey,
      channel,
      data: bundle.data,
      recipientLocale: bundle.recipient.locale ?? undefined,
      eventLocale: bundle.delivery.locale ?? undefined,
      storeDefaultLocale: this.context.store.defaultLocale,
    });
    await this.recordRendered(bundle, rendered);

    if (channel === "EMAIL") {
      if (!bundle.recipient.email) throw new Error("RECIPIENT_EMAIL_MISSING");
      const channelSetting =
        await this.repository.settings.getChannelSetting(
          base.notificationKey,
          "EMAIL"
        );
      const input: EmailDeliveryInput = {
        ...base,
        channel,
        to: [
          {
            email: bundle.recipient.email,
            name: bundle.recipient.displayName ?? undefined,
          },
        ],
        subject: rendered.subject ?? "",
        html: rendered.html,
        text: rendered.text,
        from: (channelSetting?.senderEmail ?? this.context.store.email)
          ? {
              email: channelSetting?.senderEmail ?? this.context.store.email!,
              name:
                channelSetting?.senderName ??
                this.context.store.displayName ??
                undefined,
            }
          : undefined,
        replyTo: channelSetting?.replyTo ?? undefined,
      };
      return { claimed: true, channel, input };
    }
    if (channel === "SMS") {
      if (!bundle.recipient.phone || !rendered.sms) {
        throw new Error("RECIPIENT_PHONE_MISSING");
      }
      const input: SmsDeliveryInput = {
        ...base,
        channel,
        to: bundle.recipient.phone,
        text: rendered.text,
        encoding: rendered.sms.encoding,
        segmentCount: rendered.sms.segmentCount,
      };
      return { claimed: true, channel, input };
    }
    throw new Error(`CHANNEL_NOT_SUPPORTED:${channel}`);
  }

  private async recordRendered(
    bundle: NonNullable<
      Awaited<ReturnType<typeof this.repository.deliveries.getBundle>>
    >,
    rendered: {
      subject?: string;
      html?: string;
      text: string;
      locale: string;
      contentHash: string;
      templateRevisionId?: string;
      templateRevision?: number;
      templateSourceVersion?: string;
    }
  ): Promise<void> {
    await this.repository.deliveries.recordRendered({
      deliveryId: bundle.delivery.id,
      contentHash: rendered.contentHash,
      renderedContent: {
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      },
      templateRevisionId: rendered.templateRevisionId,
      templateSourceVersion: rendered.templateSourceVersion,
      locale: rendered.locale,
    });
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function toXml(value: unknown): string {
  return `<?xml version="1.0" encoding="UTF-8"?><notification>${escapeXml(
    JSON.stringify(value)
  )}</notification>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
