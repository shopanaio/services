import { z } from "zod";
import { SLUG_REGEX } from "../../shared/slug.js";

/**
 * Tree index as int[]:
 * - Minimum 1 element
 * - Maximum 2 elements (root + child)
 * - All elements >= 0
 */
const TreeIndexSchema = z
  .array(z.number().int().min(0))
  .min(1, "Index must have at least 1 element")
  .max(2, "Index can have at most 2 elements (one level of nesting)");

const FeatureValueInputSchema = z.object({
  id: z.string().uuid().optional(),
  index: z.number().int().min(0),
  slug: z
    .string()
    .min(1, "Value slug is required")
    .max(255)
    .regex(
      SLUG_REGEX,
      "Value slug must use lowercase letters, numbers, and hyphens"
    ),
  name: z.string().min(1, "Value name is required").max(255),
});

const FeatureSyncItemSchema = z.object({
  id: z.string().uuid().optional(),
  index: TreeIndexSchema,
  slug: z
    .string()
    .min(1, "Feature slug is required")
    .max(255)
    .regex(
      SLUG_REGEX,
      "Feature slug must use lowercase letters, numbers, and hyphens"
    ),
  isGroup: z.boolean(),
  name: z.string().min(1, "Feature name is required").max(255),
  values: z.array(FeatureValueInputSchema).optional(),
});

export const FeatureSyncInputSchema = z.object({
  productId: z.string().uuid(),
  features: z.array(FeatureSyncItemSchema),
});

export type ValidatedFeatureInput = z.infer<typeof FeatureSyncItemSchema>;
export type ValidatedValueInput = z.infer<typeof FeatureValueInputSchema>;
export type ValidatedSyncInput = z.infer<typeof FeatureSyncInputSchema>;
