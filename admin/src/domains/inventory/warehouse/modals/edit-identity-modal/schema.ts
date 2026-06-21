import { z } from "zod";

export const editWarehouseIdentitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must be 255 characters or less"),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(32, "Code must be 32 characters or less")
    .regex(
      /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
      "Use uppercase letters, numbers, and single hyphens",
    ),
});
