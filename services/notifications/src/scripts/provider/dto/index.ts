import type { Apps, Notifications } from "@shopana/broker-types";

export type NotificationProviderRoutesView =
  Apps.NotificationProviderRouteStatusResult[];

export interface NotificationProviderConfigurationQueryParams {
  channel: Notifications.NotificationChannel;
}

export type NotificationProviderConfigurationView =
  Apps.GetMaskedNotificationProviderConfigResult;

export type NotificationProviderConfigureParams = Omit<
  Apps.ConfigureNotificationProviderParams,
  "storeId"
>;

export type NotificationProviderConfigureResult =
  Apps.ConfigureNotificationProviderResult;

export interface NotificationProviderTestParams {
  channel: Notifications.NotificationChannel;
  recipient?: string;
}

export type NotificationProviderTestResult =
  Notifications.NotificationProviderTestResult;

export type NotificationSendTestParams = Omit<
  Notifications.SendTestNotificationParams,
  "storeId" | "organizationId"
>;

export type NotificationSendTestResult =
  Notifications.EnqueueNotificationResult;
