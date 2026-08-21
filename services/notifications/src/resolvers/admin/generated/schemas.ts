import { z } from 'zod'
import { CurrencyCode, DimensionUnit, LocaleCode, NotificationAudience, NotificationChannel, NotificationChannelSettingInput, NotificationDefinitionSetEnabledInput, NotificationPreviewInput, NotificationTemplateUpdateInput, NotificationTestMessageInput, NotificationWebhookApiStability, NotificationWebhookCreateInput, NotificationWebhookDeleteInput, NotificationWebhookFormat, NotificationWebhookStatus, NotificationWebhookUpdateInput, PriceAdjustmentOperation, PriceAdjustmentValueType, StaffNotificationRecipientInput, StaffRecipientDeleteInput, WeightUnit } from './types.js'

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

export const NotificationWebhookApiStabilitySchema = z.nativeEnum(NotificationWebhookApiStability);

export const NotificationWebhookFormatSchema = z.nativeEnum(NotificationWebhookFormat);

export const NotificationWebhookStatusSchema = z.nativeEnum(NotificationWebhookStatus);

export const PriceAdjustmentOperationSchema = z.nativeEnum(PriceAdjustmentOperation);

export const PriceAdjustmentValueTypeSchema = z.nativeEnum(PriceAdjustmentValueType);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

export function NotificationChannelSettingInputSchema(): z.ZodObject<Properties<NotificationChannelSettingInput>> {
  return z.object({
    channel: NotificationChannelSchema,
    enabled: z.boolean(),
    key: z.string(),
    replyTo: z.string().nullish(),
    senderEmail: z.string().nullish(),
    senderName: z.string().nullish()
  })
}

export function NotificationDefinitionSetEnabledInputSchema(): z.ZodObject<Properties<NotificationDefinitionSetEnabledInput>> {
  return z.object({
    enabled: z.boolean(),
    key: z.string()
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

export function NotificationTemplateUpdateInputSchema(): z.ZodObject<Properties<NotificationTemplateUpdateInput>> {
  return z.object({
    bodyTemplate: z.string(),
    channel: NotificationChannelSchema,
    key: z.string(),
    locale: z.string(),
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

export function NotificationWebhookDeleteInputSchema(): z.ZodObject<Properties<NotificationWebhookDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function NotificationWebhookUpdateInputSchema(): z.ZodObject<Properties<NotificationWebhookUpdateInput>> {
  return z.object({
    apiVersion: z.string().nullish(),
    eventType: z.string().nullish(),
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

export function StaffRecipientDeleteInputSchema(): z.ZodObject<Properties<StaffRecipientDeleteInput>> {
  return z.object({
    id: z.string()
  })
}
