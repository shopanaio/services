import { z } from "zod";

/**
 * Schema for complete profile form.
 * firstName and lastName are required to complete onboarding.
 */
export const completeProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be 50 characters or less")
    .trim(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be 50 characters or less")
    .trim(),
});

export type CompleteProfileFormValues = z.infer<typeof completeProfileSchema>;
