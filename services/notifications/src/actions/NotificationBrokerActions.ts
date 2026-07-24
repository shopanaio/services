import { Injectable } from "@nestjs/common";
import type {
  Apps,
  Notifications,
} from "@shopana/broker-types";
import type { ContextStore } from "@shopana/shared-context";
import {
  Action,
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  type BrokerCallContext,
} from "@shopana/shared-kernel";
import { runWithContext, ServiceContext } from "../context/index.js";
import { Kernel } from "../kernel/Kernel.js";
import {
  DeliveryExecutionScript,
  type DeliveryExecutionResult,
} from "../scripts/index.js";

type GetStoreByIdResult = {
  store: ContextStore | null;
  userErrors: Array<{ message: string }>;
};

@Injectable()
export class NotificationBrokerActions extends BrokerActions {
  constructor(@InjectBroker("notifications") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Action("enqueue")
  async enqueue(
    params: Notifications.EnqueueNotificationParams,
    context: BrokerCallContext
  ): Promise<Notifications.EnqueueNotificationResult> {
    const started = await this.broker.startWorkflow(
      "notifications.enqueue",
      {
        ...params,
        subject: params.subject ?? {
          type: "notification",
          id: params.idempotencyKey,
        },
        correlationId: params.correlationId ?? params.idempotencyKey,
        sourceService: context.caller.service,
      },
      {
        source: "content",
        organizationId: params.organizationId,
        resourceId: `${context.caller.service}:${params.idempotencyKey}`,
        operation: `notifications.enqueue:${params.key}`,
        content: params,
      }
    );
    return { workflowId: started.workflowId, accepted: true };
  }

  @Action("retryDelivery")
  async retryDelivery(
    params: Notifications.RetryNotificationDeliveryParams,
    context: BrokerCallContext
  ): Promise<{ workflowId: string; accepted: boolean }> {
    this.assertInternalCaller(context);
    const store = await this.getStore(params.storeId);
    const prepared = await this.withStore(store, () =>
      this.kernel.runScript(DeliveryExecutionScript, {
        operation: "prepareRetry",
        deliveryId: params.deliveryId,
      })
    );
    if (!("success" in prepared) || !prepared.success) {
      return { workflowId: "", accepted: false };
    }
    const started = await this.broker.startWorkflow(
      "notifications.deliver",
      toDeliveryContext(store, params.organizationId, params.deliveryId),
      {
        source: "content",
        organizationId: params.organizationId,
        resourceId: params.deliveryId,
        operation: `notifications.retryDelivery:${params.idempotencyKey}`,
        content: params,
      }
    );
    return { workflowId: started.workflowId, accepted: true };
  }

  @Action("cancelDelivery")
  async cancelDelivery(
    params: Notifications.CancelNotificationDeliveryParams,
    context: BrokerCallContext
  ): Promise<{ cancelled: boolean }> {
    this.assertInternalCaller(context);
    const store = await this.getStore(params.storeId);
    const result = await this.withStore(store, () =>
      this.kernel.runScript(DeliveryExecutionScript, {
        operation: "cancel",
        deliveryId: params.deliveryId,
      })
    );
    return { cancelled: "success" in result && result.success };
  }

  @Action("sendTest")
  async sendTest(
    params: Notifications.SendTestNotificationParams,
    context: BrokerCallContext
  ): Promise<Notifications.EnqueueNotificationResult> {
    this.assertInternalCaller(context);
    const route =
      await this.broker.call<Apps.NotificationProviderRouteStatusResult>(
        "apps.getNotificationProviderRouteStatus",
        { storeId: params.storeId, channel: params.channel }
      );
    if (!route.configured || route.status !== "active") {
      throw new Error(`No active provider configured for ${params.channel}`);
    }
    const started = await this.broker.startWorkflow(
      "notifications.enqueue",
      {
        storeId: params.storeId,
        organizationId: params.organizationId,
        key: params.key,
        recipients: [params.recipient],
        locale: params.locale,
        data: params.data,
        idempotencyKey: params.idempotencyKey,
        subject: { type: "notificationTest", id: params.idempotencyKey },
        correlationId: params.idempotencyKey,
        sourceService: "notifications",
        purpose: "TEST",
        forcedChannels: [params.channel],
      },
      {
        source: "content",
        organizationId: params.organizationId,
        resourceId: params.idempotencyKey,
        operation: "notifications.sendTest",
        content: params,
      }
    );
    return { workflowId: started.workflowId, accepted: true };
  }

  @Action("preview")
  async preview(
    params: Notifications.PreviewNotificationParams,
    context: BrokerCallContext
  ): Promise<Notifications.PreviewNotificationResult> {
    this.assertInternalCaller(context);
    const store = await this.getStore(params.storeId);
    return this.withStore(store, () => this.kernel.renderer.preview(params));
  }

  @Action("getDefinition")
  async getDefinition(
    params: Notifications.GetNotificationDefinitionParams,
    context: BrokerCallContext
  ) {
    this.assertInternalCaller(context);
    const store = await this.getStore(params.storeId);
    return this.withStore(store, async () => {
      const definition = this.kernel.definitions.get(params.key);
      const setting =
        await this.kernel.repository.settings.getDefinitionSetting(params.key);
      const channelSettings =
        await this.kernel.repository.settings.listChannelSettings(params.key);
      return {
        ...definition,
        dataSchema: undefined,
        triggers: definition.triggers,
        enabled: definition.optional ? (setting?.enabled ?? false) : true,
        activeChannels: definition.allowedChannels.filter(
          (channel) =>
            channelSettings.find((entry) => entry.channel === channel)
              ?.enabled ?? definition.defaultChannels.includes(channel)
        ),
      };
    });
  }

  @Action("getTemplate")
  async getTemplate(
    params: Notifications.GetNotificationTemplateParams,
    context: BrokerCallContext
  ) {
    this.assertInternalCaller(context);
    const store = await this.getStore(params.storeId);
    return this.withStore(store, async () => {
      const active = await this.kernel.repository.templates.findActive(
        params.key,
        params.channel,
        params.locale
      );
      return active
        ? {
            source: "REVISION",
            pointerVersion: active.pointerVersion,
            revision: active.revision,
          }
        : { source: "DEFAULT", revision: null };
    });
  }

  @Action("getDelivery")
  async getDelivery(
    params: Notifications.GetNotificationDeliveryParams,
    context: BrokerCallContext
  ) {
    this.assertInternalCaller(context);
    const store = await this.getStore(params.storeId);
    return this.withStore(store, async () => {
      const bundle =
        await this.kernel.repository.deliveries.getBundle(params.deliveryId);
      if (!bundle) return null;
      return {
        delivery: {
          id: bundle.delivery.id,
          occurrenceId: bundle.delivery.occurrenceId,
          channel: bundle.delivery.channel,
          purpose: bundle.delivery.purpose,
          status: bundle.delivery.status,
          providerCode: bundle.delivery.providerCode,
          providerMessageId: bundle.delivery.providerMessageId,
          locale: bundle.delivery.locale,
          attemptCount: bundle.delivery.attemptCount,
          nextAttemptAt: bundle.delivery.nextAttemptAt,
          lastErrorKind: bundle.delivery.lastErrorKind,
          lastErrorCode: bundle.delivery.lastErrorCode,
          createdAt: bundle.delivery.createdAt,
          updatedAt: bundle.delivery.updatedAt,
        },
        occurrence: {
          id: bundle.occurrence.id,
          definitionKey: bundle.occurrence.definitionKey,
          sourceEventId: bundle.occurrence.sourceEventId,
          sourceEventType: bundle.occurrence.sourceEventType,
          correlationId: bundle.occurrence.correlationId,
          status: bundle.occurrence.status,
          createdAt: bundle.occurrence.createdAt,
        },
        recipient: {
          id: bundle.recipient.id,
          recipientRef: bundle.recipient.recipientRef,
          customerId: bundle.recipient.customerId,
          userId: bundle.recipient.userId,
          locale: bundle.recipient.locale,
          displayName: bundle.recipient.displayName,
        },
      };
    });
  }

  @Action("listDeliveryAttempts")
  async listDeliveryAttempts(
    params: Notifications.ListNotificationDeliveryAttemptsParams,
    context: BrokerCallContext
  ) {
    this.assertInternalCaller(context);
    const store = await this.getStore(params.storeId);
    return this.withStore(store, () =>
      this.kernel.repository.deliveries.listAttempts(params.deliveryId)
    );
  }

  @Action("rotateWebhookSecret")
  async rotateWebhookSecret(params: {
    storeId: string;
    actorId?: string;
    gracePeriodHours?: number;
  }, context: BrokerCallContext): Promise<{ secret: string }> {
    this.assertInternalCaller(context);
    const store = await this.getStore(params.storeId);
    return this.withStore(store, async () => ({
      secret: await this.kernel.repository.webhooks.rotateSecret(
        params.actorId,
        params.gracePeriodHours
      ),
    }));
  }

  @Action("getProviderRouteStatus")
  getProviderRouteStatus(
    params: Apps.NotificationProviderRouteStatusParams,
    context: BrokerCallContext
  ): Promise<Apps.NotificationProviderRouteStatusResult> {
    this.assertInternalCaller(context);
    return this.broker.call("apps.getNotificationProviderRouteStatus", params);
  }

  private assertInternalCaller(context: BrokerCallContext): void {
    if (
      context.caller.kind !== "action" ||
      context.caller.service !== "notifications"
    ) {
      throw new Error("Notification administration action is internal");
    }
  }

  private async getStore(storeId: string): Promise<ContextStore> {
    const result = await this.broker.call<
      GetStoreByIdResult,
      { id: string }
    >("project.getStoreById", { id: storeId });
    if (!result.store) {
      throw new Error(
        result.userErrors[0]?.message ?? `Store ${storeId} was not found`
      );
    }
    return result.store;
  }

  private withStore<T>(
    store: ContextStore,
    operation: () => Promise<T>
  ): Promise<T> {
    return runWithContext(
      new ServiceContext({
        requestId: `notification-broker-${Date.now()}`,
        kernel: this.kernel,
        store,
        locale: store.defaultLocale,
      }),
      operation
    );
  }
}

function toDeliveryContext(
  store: ContextStore,
  organizationId: string,
  deliveryId: string
) {
  return {
    storeId: store.id,
    organizationId,
    deliveryId,
    defaultLocale: store.defaultLocale,
    locale: store.defaultLocale,
    displayName: store.displayName,
    timezone: store.timezone,
  };
}
