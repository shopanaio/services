import { z } from "zod";

export const createFacetValueSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  slug: z.string().trim().optional().default(""),
  enabled: z.boolean(),
  sourceHandles: z
    .array(z.string())
    .transform((values) => values.map((value) => value.trim()).filter(Boolean))
    .refine((values) => values.length > 0, {
      message: "At least one source handle is required",
    }),
  swatchId: z.string().nullable().optional(),
});

export type CreateFacetValueFormValues = z.infer<
  typeof createFacetValueSchema
>;
