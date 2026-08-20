import type {
  NotificationChannel,
  NotificationDefinitionKey,
  PreviewNotificationParams,
  PreviewNotificationResult,
} from "@shopana/broker-types";
import type { NotificationTemplateRenderer } from "../../../infrastructure/templates/NotificationTemplateRenderer.js";

export type NotificationEffectiveTemplateView = Awaited<
  ReturnType<NotificationTemplateRenderer["getEffectiveTemplate"]>
>;

export interface NotificationTemplateQueryParams {
  key: NotificationDefinitionKey;
  channel: NotificationChannel;
  locale: string;
}

export interface NotificationTemplateUpdateParams extends NotificationTemplateQueryParams {
  subjectTemplate?: string;
  bodyTemplate: string;
  plainTextTemplate?: string;
  expectedVersion: number;
}

export type NotificationPreviewParams = Omit<PreviewNotificationParams, "storeId">;

export type NotificationPreviewView = PreviewNotificationResult;
