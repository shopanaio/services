import { z } from "zod";

export const fulfillmentStageFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(80),
  handle: z.string().trim().min(1, "Handle is required").max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase slug"),
});

export type FulfillmentStageFormValues = z.infer<typeof fulfillmentStageFormSchema>;
