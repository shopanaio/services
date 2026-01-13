import { z } from "zod";

/**
 * Common validation schemas shared across auth forms.
 * These provide consistent validation rules for email and password fields.
 */

/**
 * Email validation schema.
 * Enforces proper email format and length constraints.
 */
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(255, "Email must be 255 characters or less");

/**
 * Password validation schema.
 * Enforces minimum 8 characters as per API requirements.
 */
export const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or less");

/**
 * Password confirmation schema.
 * Use with refine to validate password match.
 */
export const confirmPasswordSchema = z
  .string()
  .min(1, "Please confirm your password");

/**
 * Creates a schema for password with confirmation.
 * Use this for sign-up forms where password confirmation is required.
 */
export const passwordWithConfirmSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
