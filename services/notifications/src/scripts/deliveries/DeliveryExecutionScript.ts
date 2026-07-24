import { createHash } from "node:crypto";
import type {
  EmailDeliveryInput,
  IntegrationDeliveryInput,
  NotificationDeliveryInput,
  NotificationDeliveryReceipt,
  SmsDeliveryInput,
  WebhookDeliveryInput,
} from "@shopana/broker-types";
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";

export type DeliveryExecutionParams =
  | { operation: "claimAndRender"; deliveryId: string }
  | { operation: "createAttempt"; deliveryId: string; workflowId: string }
  | {
      operation: "recordSuccess";
      deliveryId: string;
      attemptId: string;
      providerCode: string;
      providerSlotId: string;
      receipt: NotificationDeliveryReceipt;
    }
  | {
      operation: "recordFailure";
      deliveryId: string;
      attemptId: string;
      status:
        | "RETRY_SCHEDULED"
        | "UNKNOWN"
        | "FAILED_PERMANENT"
        | "DEAD"
        | "BLOCKED_NO_PROVIDER";
      errorKind: string;
      errorCode?: string;
      providerCode?: string;
      providerSlotId?: string;
      providerMessageId?: string;
      nextAttemptAt?: string;
      diagnostics?: Record<string, unknown>;
    }
  | { operation: "prepareRetry"; deliveryId: string }
  | { operation: "cancel"; deliveryId: string }
  | { operation: "getStatusLookup"; deliveryId: string }
  | {
      operation: "reconcileSuccess";
      deliveryId: string;
      state: "ACCEPTED" | "DELIVERED";
      providerCode: string;
      providerSlotId: string;
      providerMessageId?: string;
      responseCode?: string;
    }
  | {
      operation: "reconcileFailure";
      deliveryId: string;
      errorCode: string;
      errorKind?: string;
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
  | { success: boolean }
  | {
      found: true;
      channel: NotificationDeliveryInput["channel"];
      currentStatus: "UNKNOWN" | "ACCEPTED";
      providerMessageId: string;
      providerCode: string;
      providerSlotId: string;
    }
  | {
      found: false;
      reason:
        | "DELIVERY_NOT_FOUND"
        | "DELIVERY_NOT_RECONCILABLE"
        | "PROVIDER_MESSAGE_ID_MISSING"
        | "PROVIDER_ROUTE_MISSING";
      status?: string;
    };

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
      case "recordSuccess":
        await this.repository.deliveries.recordSuccess({
          deliveryId: params.deliveryId,
          attemptId: params.attemptId,
          state:
            params.receipt.state === "DELIVERED" ? "DELIVERED" : "ACCEPTED",
          providerCode: params.providerCode,
          providerSlotId: params.providerSlotId,
          providerMessageId: params.receipt.providerMessageId,
          responseCode: params.receipt.responseCode,
        });
        return { success: true };
      case "recordFailure":
        await this.repository.deliveries.recordFailure(params);
        return { success: true };
      case "prepareRetry":
        return {
          success: await this.repository.deliveries.prepareRetry(
            params.deliveryId
          ),
        };
      case "cancel":
        return {
          success: await this.repository.deliveries.cancel(params.deliveryId),
        };
      case "getStatusLookup": {
        const bundle = await this.repository.deliveries.getBundle(
          params.deliveryId
        );
        if (!bundle) {
          return { found: false, reason: "DELIVERY_NOT_FOUND" };
        }
        if (
          bundle.delivery.status !== "UNKNOWN" &&
          bundle.delivery.status !== "ACCEPTED"
        ) {
          return {
            found: false,
            reason: "DELIVERY_NOT_RECONCILABLE",
            status: bundle.delivery.status,
          };
        }
        if (!bundle.delivery.providerMessageId) {
          return {
            found: false,
            reason: "PROVIDER_MESSAGE_ID_MISSING",
          };
        }
        if (
          !bundle.delivery.providerCode ||
          !bundle.delivery.providerSlotId
        ) {
          return { found: false, reason: "PROVIDER_ROUTE_MISSING" };
        }
        return {
          found: true,
          channel: bundle.delivery.channel,
          currentStatus: bundle.delivery.status,
          providerMessageId: bundle.delivery.providerMessageId,
          providerCode: bundle.delivery.providerCode,
          providerSlotId: bundle.delivery.providerSlotId,
        };
      }
      case "reconcileSuccess":
        await this.repository.deliveries.reconcileSuccess(params);
        return { success: true };
      case "reconcileFailure":
        await this.repository.deliveries.reconcileFailure(params);
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
        subscription.id,
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
        from: channelSetting?.senderEmail
          ? {
              email: channelSetting.senderEmail,
              name: channelSetting.senderName ?? undefined,
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
    const input: IntegrationDeliveryInput = {
      ...base,
      channel: "INTEGRATION",
      integrationType: base.notificationKey,
      payload: JSON.parse(
        rendered.text
      ) as IntegrationDeliveryInput["payload"],
    };
    return { claimed: true, channel, input };
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
