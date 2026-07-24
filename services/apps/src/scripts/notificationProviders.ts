import type { Apps, Notifications } from "@shopana/broker-types";
import { Domain, maskSecrets } from "@shopana/plugin-sdk";
import type { TransactionScript } from "../kernel/types.js";

export const configureNotificationProvider: TransactionScript<
  Apps.ConfigureNotificationProviderParams,
  Apps.ConfigureNotificationProviderResult
> = async (params, services) => {
  const descriptor = services.pluginManager
    .listManifests()
    .find((entry) => entry.manifest.code === params.providerCode);
  if (
    !descriptor ||
    !descriptor.allowed ||
    !descriptor.compatible ||
    !descriptor.manifest.domains.includes("notifications")
  ) {
    throw new Error("Notification provider is not available");
  }

  const notificationManifest = descriptor.manifest as typeof descriptor.manifest & {
    notification?: { channels?: readonly string[] };
  };
  if (!notificationManifest.notification?.channels?.includes(params.channel)) {
    throw new Error(
      `Provider ${params.providerCode} does not support ${params.channel}`
    );
  }
  const capabilities = [...notificationManifest.notification.channels];

  for (const [name, value] of Object.entries(params.config)) {
    if (
      /(password|secret|token|api.?key|private.?key)/i.test(name) &&
      typeof value === "string"
    ) {
      throw new Error(
        `Sensitive provider field ${name} must be supplied through secretFields`
      );
    }
  }
  const existingSlot = (
    await services.slotsRepository.findAllSlots(
      params.storeId,
      "notifications"
    )
  ).find((slot) => slot.provider === params.providerCode);
  const retainedConfig = existingSlot?.config?.data ?? {};
  const baseConfig = {
    ...retainedConfig,
    ...Object.fromEntries(
      Object.entries(params.config).filter(([, value]) => value !== "***")
    ),
  };
  await services.pluginManager.validateConfiguration({
    pluginCode: params.providerCode,
    rawConfig: {
      ...baseConfig,
      ...(params.secretFields ?? {}),
    },
    storeId: params.storeId,
  });

  const slot =
    existingSlot ??
    (await services.slotsRepository.upsertSlot({
      domain: "notifications",
      storeId: params.storeId,
      provider: params.providerCode,
      capabilities,
      data: baseConfig,
      status: "inactive",
    }));
  const completeConfig: Record<string, unknown> = { ...baseConfig };
  for (const [name, value] of Object.entries(params.secretFields ?? {})) {
    completeConfig[name] = await services.secretStore.set({
      storeId: params.storeId,
      providerConfigId: slot.provider_config_id,
      name,
      value,
    });
  }

  await services.slotsRepository.updateProviderConfigData({
    storeId: params.storeId,
    providerConfigId: slot.provider_config_id,
    data: completeConfig,
    status: params.status ?? "active",
  });
  if (existingSlot) {
    await services.slotsRepository.updateSlotCapabilities({
      storeId: params.storeId,
      slotId: slot.id,
      capabilities,
    });
  }
  const assignment = await services.slotsRepository.upsertAssignment({
    storeId: params.storeId,
    aggregate: "notifications",
    aggregateId: params.channel,
    slotId: slot.id,
    domain: "notifications",
  });

  return {
    providerCode: params.providerCode,
    channel: params.channel,
    slotId: slot.id,
    assignmentId: assignment.id,
    maskedConfig: maskSecrets(completeConfig) as Record<string, unknown>,
  };
};

export const getNotificationProviderRouteStatus: TransactionScript<
  Apps.NotificationProviderRouteStatusParams,
  Apps.NotificationProviderRouteStatusResult
> = async (params, services) => {
  const resolved =
    await services.slotsRepository.findAssignedSlotForAggregate(
      "notifications",
      params.storeId,
      "notifications",
      params.channel,
      params.channel
    );
  return resolved
    ? {
        channel: params.channel,
        configured: true,
        providerCode: resolved.slot.provider,
        slotId: resolved.slot.id,
        assignmentId: resolved.assignment.id,
        status: resolved.slot.config?.status,
      }
    : { channel: params.channel, configured: false };
};

export const getMaskedNotificationProviderConfig: TransactionScript<
  Apps.GetMaskedNotificationProviderConfigParams,
  Apps.GetMaskedNotificationProviderConfigResult
> = async (params, services) => {
  const resolved =
    await services.slotsRepository.findAssignedSlotForAggregate(
      "notifications",
      params.storeId,
      "notifications",
      params.channel,
      params.channel
    );
  if (!resolved?.slot.config) {
    throw new Error(`No provider configured for ${params.channel}`);
  }
  return {
    providerCode: resolved.slot.provider,
    channel: params.channel,
    status: resolved.slot.config.status,
    config: maskSecrets(resolved.slot.config.data) as Record<string, unknown>,
  };
};

export const testNotificationProvider: TransactionScript<
  Apps.TestNotificationProviderParams,
  Notifications.NotificationProviderTestResult
> = async (params, services) => {
  const resolved =
    await services.slotsRepository.findAssignedSlotForAggregate(
      "notifications",
      params.storeId,
      "notifications",
      params.channel,
      params.channel
    );
  if (!resolved) {
    throw new Error(`No provider configured for ${params.channel}`);
  }
  return services.pluginManager.executeOnProvider({
    domain: Domain.NOTIFICATIONS,
    operationId: "testConnection",
    pluginCode: resolved.slot.provider,
    rawConfig: resolved.slot.config?.data ?? {},
    storeId: params.storeId,
    input: params.input ?? { channel: params.channel },
    retries: 0,
  }) as Promise<Notifications.NotificationProviderTestResult>;
};
