import { z } from "zod";
import type { UserError } from "@shopana/shared-kernel";

/**
 * Validation schema for profile update input
 */
export const userUpdateProfileInputSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name must be at least 1 character")
    .max(100, "First name must be at most 100 characters")
    .optional(),
  lastName: z
    .string()
    .min(1, "Last name must be at least 1 character")
    .max(100, "Last name must be at most 100 characters")
    .optional(),
  language: z
    .string()
    .min(2, "Language code must be at least 2 characters")
    .max(10, "Language code must be at most 10 characters")
    .optional(),
  image: z.string().uuid("Invalid image ID").nullable().optional(),
});

export const userUpdateProfileParamsSchema = userUpdateProfileInputSchema.extend({
  userId: z.string().min(1, "User ID is required"),
});

export type UserUpdateProfileInput = z.infer<typeof userUpdateProfileInputSchema>;

/**
 * Script params
 */
export type UserUpdateProfileParams = z.infer<typeof userUpdateProfileParamsSchema>;

/**
 * Script result
 */
export interface UserUpdateProfileResult {
  userId?: string;
  userErrors: UserError[];
}
