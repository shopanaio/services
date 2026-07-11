import { z } from "zod";

export const linkSourceValuesSchema = z.object({
  sourceHandles: z
    .array(z.string())
    .transform((values) => values.map((value) => value.trim()).filter(Boolean))
    .refine((values) => values.length > 0, {
      message: "At least one source handle is required",
    }),
});

export type LinkSourceValuesFormValues = z.infer<typeof linkSourceValuesSchema>;
