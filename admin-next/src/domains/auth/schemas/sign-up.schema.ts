import { z } from "zod";
import { emailSchema, passwordSchema, confirmPasswordSchema } from "./common.schema";

/**
 * Sign-up form validation schema.
 * Includes password confirmation validation.
 */
export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Type for sign-up form values.
 */
export type SignUpFormValues = z.infer<typeof signUpSchema>;
