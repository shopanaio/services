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
        error instanceof CollectionContractValidationError
          ? error.message
          : "Invalid handle",
    });
    return z.NEVER;
  }
});

const OptionSwatchInputSchema = z
  .object({
    swatchType: z.enum(["COLOR", "GRADIENT", "IMAGE"]),
    colorOne: z.string().optional(),
    colorTwo: z.string().optional(),
    fileId: z.string().uuid().optional(),
    metadata: z.unknown().optional(),
  })
  .optional()
  .nullable();

const OptionValueSyncInputSchema = z.object({
  id: z.string().uuid().optional(),
  sortIndex: z.number().int().min(0),
  slug: CanonicalHandleSchema,
  name: z.string().min(1, "Value name is required").max(255),
  swatch: OptionSwatchInputSchema,
});

const OptionSyncItemSchema = z.object({
  id: z.string().uuid().optional(),
  sortIndex: z.number().int().min(0),
  slug: CanonicalHandleSchema,
  name: z.string().min(1, "Option name is required").max(255),
  categoryId: z.string().uuid(),
  values: z.array(OptionValueSyncInputSchema).min(1, "Option must have at least one value"),
});

export const OptionSyncInputSchema = z.object({
  productId: z.string().uuid(),
  options: z.array(OptionSyncItemSchema),
});

export type ValidatedOptionInput = z.infer<typeof OptionSyncItemSchema>;
export type ValidatedValueInput = z.infer<typeof OptionValueSyncInputSchema>;
export type ValidatedSyncInput = z.infer<typeof OptionSyncInputSchema>;
