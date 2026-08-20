import { z } from "zod";

const stringArraySchema = z.array(z.string());

// Mirrors CdnRoutingConditions's open index signature — known fields are
// shape-checked, unrecognized keys pass through unchanged.
const cdnRoutingConditionsSchema = z
  .object({
    mediaTypes: stringArraySchema.optional(),
    mimeTypes: stringArraySchema.optional(),
    providers: stringArraySchema.optional(),
    extensions: stringArraySchema.optional(),
    countries: stringArraySchema.optional(),
    minSizeBytes: z.number().finite().min(0).optional(),
    maxSizeBytes: z.number().finite().min(0).optional(),
  })
  .catchall(z.unknown())
  .refine(
    (value) =>
      value.minSizeBytes === undefined ||
      value.maxSizeBytes === undefined ||
      value.minSizeBytes <= value.maxSizeBytes,
    {
      message: "maxSizeBytes must be greater than or equal to minSizeBytes",
      path: ["maxSizeBytes"],
    },
  )
  .nullable()
  .optional();

const cdnTransformOverridesSchema = z.record(z.string(), z.unknown()).nullable().optional();

export const cdnRoutingRuleCreateSchema = z.object({
  cdnConfigurationId: z.string().trim().min(1, "cdnConfigurationId is required"),
  name: z.string().trim().min(1, "Name is required").max(255),
  priority: z.number().int().min(0).max(100_000).optional(),
  enabled: z.boolean().optional(),
  conditions: cdnRoutingConditionsSchema,
  transformOverrides: cdnTransformOverridesSchema,
});

export const cdnRoutingRuleUpdateSchema = z.object({
  id: z.string().trim().min(1, "id is required"),
  cdnConfigurationId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(255).optional(),
  priority: z.number().int().min(0).max(100_000).optional(),
  enabled: z.boolean().optional(),
  conditions: cdnRoutingConditionsSchema,
  transformOverrides: cdnTransformOverridesSchema,
});

export const cdnRoutingRuleIdSchema = z.object({
  id: z.string().trim().min(1, "id is required"),
});
