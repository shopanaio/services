import { z } from "zod";
import {
  CollectionContractValidationError,
  normalizeCollectionRuleHandleV1,
} from "@shopana/broker-types";

const CanonicalHandleSchema = z.string().transform((value, context) => {
  try {
    return normalizeCollectionRuleHandleV1(value);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        error instanceof CollectionContractValidationError ? error.message : "Invalid handle",
    });
    return z.NEVER;
  }
});

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
  slug: CanonicalHandleSchema,
  name: z.string().min(1, "Value name is required").max(255),
});

const FeatureSyncItemSchema = z.object({
  id: z.string().uuid().optional(),
  index: TreeIndexSchema,
  slug: CanonicalHandleSchema,
  isGroup: z.boolean(),
  featured: z.boolean(),
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
