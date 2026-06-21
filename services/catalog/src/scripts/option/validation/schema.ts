import { z } from "zod";

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
  slug: z.string().min(1, "Value slug is required").max(255),
  name: z.string().min(1, "Value name is required").max(255),
  swatch: OptionSwatchInputSchema,
});

const OptionSyncItemSchema = z.object({
  id: z.string().uuid().optional(),
  sortIndex: z.number().int().min(0),
  slug: z.string().min(1, "Option slug is required").max(255),
  name: z.string().min(1, "Option name is required").max(255),
  displayType: z.enum(["DROPDOWN", "SWATCH", "BUTTONS"]),
  values: z.array(OptionValueSyncInputSchema).min(1, "Option must have at least one value"),
});

export const OptionSyncInputSchema = z.object({
  productId: z.string().uuid(),
  options: z.array(OptionSyncItemSchema),
});

export type ValidatedOptionInput = z.infer<typeof OptionSyncItemSchema>;
export type ValidatedValueInput = z.infer<typeof OptionValueSyncInputSchema>;
export type ValidatedSyncInput = z.infer<typeof OptionSyncInputSchema>;
