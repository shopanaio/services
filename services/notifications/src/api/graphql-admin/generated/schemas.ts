import { z } from 'zod'
import { CurrencyCode, DimensionUnit, LocaleCode, NotificationAudience, NotificationChannel, NotificationChannelSettingInput, NotificationDeliveryStatus, NotificationPreviewInput, NotificationProviderConfigurationInput, NotificationTemplateRevisionInput, NotificationTemplateSourceField, NotificationTemplateValidationInput, NotificationTestMessageInput, NotificationWebhookApiStability, NotificationWebhookCreateInput, NotificationWebhookFormat, NotificationWebhookStatus, NotificationWebhookUpdateInput, StaffNotificationRecipientInput, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const NotificationAudienceSchema = z.nativeEnum(NotificationAudience);

export const NotificationChannelSchema = z.nativeEnum(NotificationChannel);

export const NotificationDeliveryStatusSchema = z.nativeEnum(NotificationDeliveryStatus);

export const NotificationTemplateSourceFieldSchema = z.nativeEnum(NotificationTemplateSourceField);

export const NotificationWebhookApiStabilitySchema = z.nativeEnum(NotificationWebhookApiStability);

export const NotificationWebhookFormatSchema = z.nativeEnum(NotificationWebhookFormat);

export const NotificationWebhookStatusSchema = z.nativeEnum(NotificationWebhookStatus);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

export function NotificationChannelSettingInputSchema(): z.ZodObject<Properties<NotificationChannelSettingInput>> {
  return z.object({
    channel: NotificationChannelSchema,
    enabled: z.boolean(),
    expectedVersion: z.number(),
    key: z.string(),
    replyTo: z.string().nullish(),
    senderEmail: z.string().nullish(),
    senderName: z.string().nullish()
  })
}

export function NotificationPreviewInputSchema(): z.ZodObject<Properties<NotificationPreviewInput>> {
  return z.object({
    bodyTemplate: z.string().nullish(),
    channel: NotificationChannelSchema,
    data: z.record(z.unknown()),
    key: z.string(),
    locale: z.string().nullish(),
    plainTextTemplate: z.string().nullish(),
    subjectTemplate: z.string().nullish()
  })
}

export function NotificationProviderConfigurationInputSchema(): z.ZodObject<Properties<NotificationProviderConfigurationInput>> {
  return z.object({
    active: z.boolean().default(true).nullish(),
    channel: NotificationChannelSchema,
    config: z.record(z.unknown()),
    providerCode: z.string(),
    secretFields: z.record(z.unknown()).nullish()
  })
}

export function NotificationTemplateRevisionInputSchema(): z.ZodObject<Properties<NotificationTemplateRevisionInput>> {
  return z.object({
    bodyTemplate: z.string(),
    channel: NotificationChannelSchema,
    key: z.string(),
    locale: z.string(),
    plainTextTemplate: z.string().nullish(),
    subjectTemplate: z.string().nullish()
  })
}

export function NotificationTemplateValidationInputSchema(): z.ZodObject<Properties<NotificationTemplateValidationInput>> {
  return z.object({
    bodyTemplate: z.string(),
    channel: NotificationChannelSchema,
    key: z.string(),
    plainTextTemplate: z.string().nullish(),
    subjectTemplate: z.string().nullish()
  })
}

export function NotificationTestMessageInputSchema(): z.ZodObject<Properties<NotificationTestMessageInput>> {
  return z.object({
    channel: NotificationChannelSchema,
    customerId: z.string().nullish(),
    data: z.record(z.unknown()),
    email: z.string().nullish(),
    idempotencyKey: z.string(),
    key: z.string(),
    locale: z.string().nullish(),
    name: z.string().nullish(),
    phone: z.string().nullish(),
    recipientId: z.string().nullish(),
    userId: z.string().nullish()
  })
}

export function NotificationWebhookCreateInputSchema(): z.ZodObject<Properties<NotificationWebhookCreateInput>> {
  return z.object({
    apiVersion: z.string(),
    eventType: z.string(),
    format: NotificationWebhookFormatSchema,
    url: z.string()
  })
}

export function NotificationWebhookUpdateInputSchema(): z.ZodObject<Properties<NotificationWebhookUpdateInput>> {
  return z.object({
    apiVersion: z.string().nullish(),
    eventType: z.string().nullish(),
    expectedVersion: z.number(),
    format: NotificationWebhookFormatSchema.nullish(),
    id: z.string(),
    status: NotificationWebhookStatusSchema.nullish(),
    url: z.string().nullish()
  })
}

export function StaffNotificationRecipientInputSchema(): z.ZodObject<Properties<StaffNotificationRecipientInput>> {
  return z.object({
    email: z.string(),
    enabled: z.boolean(),
    eventKeys: z.array(z.string()),
    id: z.string().nullish(),
    locale: z.string(),
    name: z.string(),
    timezone: z.string(),
    userId: z.string().nullish()
  })
}
