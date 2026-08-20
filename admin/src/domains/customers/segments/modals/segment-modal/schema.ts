import { z } from "zod";

export const segmentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Segment name is required")
    .max(100, "Name must be at most 100 characters"),
  description: z.string().trim().max(500, "Description must be at most 500 characters"),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Select a valid segment color"),
});

export type SegmentFormValues = z.infer<typeof segmentFormSchema>;
