import type {
  NotificationAudience,
  NotificationChannel,
  NotificationDefinitionKey,
  NotificationTemplateVariable,
} from "@shopana/broker-types";
import type { SettingsRepository } from "../../../repositories/settings/SettingsRepository.js";

export interface NotificationDefinitionView {
  key: NotificationDefinitionKey;
  title: string;
  audience: NotificationAudience;
  optional: boolean;
  enabled: boolean;
  allowedChannels: readonly NotificationChannel[];
  defaultChannels: readonly NotificationChannel[];
  activeChannels: readonly NotificationChannel[];
  variables: readonly NotificationTemplateVariable[];
  version: number;
}

export interface NotificationChannelSettingView {
  definitionKey: NotificationDefinitionKey;
  channel: NotificationChannel;
  enabled: boolean;
  senderName: string | null;
  senderEmail: string | null;
  replyTo: string | null;
  version: number;
  updatedAt: string | null;
}

export type NotificationDefinitionSettingView = Awaited<
  ReturnType<SettingsRepository["setDefinitionEnabled"]>
>;

export type NotificationChannelSettingWriteView = Awaited<
  ReturnType<SettingsRepository["setChannelEnabled"]>
>;

export interface NotificationDefinitionSetEnabledParams {
  key: NotificationDefinitionKey;
  enabled: boolean;
  expectedVersion: number;
}

export interface NotificationChannelSetEnabledParams {
  key: NotificationDefinitionKey;
  channel: NotificationChannel;
  enabled: boolean;
  expectedVersion: number;
  senderName?: string;
  senderEmail?: string;
  replyTo?: string;
}
