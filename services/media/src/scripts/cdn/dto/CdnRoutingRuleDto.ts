import { z } from "zod";

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const cdnRoutingRuleCreateSchema = z.object({
  cdnConfigurationId: z.string().trim().min(1, "cdnConfigurationId is required"),
  name: z.string().trim().min(1, "Name is required").max(255),
  priority: z.number().int().min(0).max(100_000).optional(),
  enabled: z.boolean().optional(),
  conditions: jsonObjectSchema.nullable().optional(),
  transformOverrides: jsonObjectSchema.nullable().optional(),
});

export const cdnRoutingRuleUpdateSchema = z.object({
  id: z.string().trim().min(1, "id is required"),
  cdnConfigurationId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(255).optional(),
  priority: z.number().int().min(0).max(100_000).optional(),
  enabled: z.boolean().optional(),
  conditions: jsonObjectSchema.nullable().optional(),
  transformOverrides: jsonObjectSchema.nullable().optional(),
});

export const cdnRoutingRuleIdSchema = z.object({
  id: z.string().trim().min(1, "id is required"),
});
