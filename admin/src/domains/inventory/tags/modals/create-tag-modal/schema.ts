import { z } from "zod";

const handleSchema = z
  .string()
  .min(1, "Handle is required")
  .max(255, "Handle must be 255 characters or less")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Handle must contain only lowercase letters, numbers, and hyphens",
  );

export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less"),
  handle: handleSchema,
});

export type CreateTagFormValues = z.infer<typeof createTagSchema>;
