import { z } from "zod";

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const cdnConfigurationCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  provider: z.string().trim().min(1, "Provider is required").max(100),
  baseUrl: z.string().trim().min(1, "baseUrl is required").max(2048),
  pathPrefix: z.string().trim().max(500).optional(),
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  signingMode: z.string().trim().min(1).max(100).optional(),
  secretRef: z.string().trim().max(500).nullable().optional(),
  transformStrategy: z.string().trim().min(1).max(100).optional(),
  urlTemplate: z.string().trim().max(2048).nullable().optional(),
  providerConfig: jsonObjectSchema.optional(),
  transformConfig: jsonObjectSchema.optional(),
});

export const cdnConfigurationUpdateSchema = z.object({
  id: z.string().trim().min(1, "id is required"),
  name: z.string().trim().min(1).max(255).optional(),
  provider: z.string().trim().min(1).max(100).optional(),
  baseUrl: z.string().trim().min(1).max(2048).optional(),
  pathPrefix: z.string().trim().max(500).optional(),
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  signingMode: z.string().trim().min(1).max(100).optional(),
  secretRef: z.string().trim().max(500).nullable().optional(),
  transformStrategy: z.string().trim().min(1).max(100).optional(),
  urlTemplate: z.string().trim().max(2048).nullable().optional(),
  providerConfig: jsonObjectSchema.optional(),
  transformConfig: jsonObjectSchema.optional(),
});

export const cdnConfigurationIdSchema = z.object({
  id: z.string().trim().min(1, "id is required"),
});

export const cdnConfigurationTestSchema = cdnConfigurationCreateSchema.extend({
  objectPath: z.string().trim().min(1, "objectPath is required").max(2048),
  transform: z
    .object({
      fit: z.string().optional().nullable(),
      gravity: z.string().optional().nullable(),
      maxHeight: z.number().int().positive().optional().nullable(),
      maxWidth: z.number().int().positive().optional().nullable(),
      preferredContentType: z.string().optional().nullable(),
      scale: z.number().int().positive().optional().nullable(),
      quality: z.number().int().min(1).max(100).optional().nullable(),
    })
    .optional()
    .nullable(),
});
