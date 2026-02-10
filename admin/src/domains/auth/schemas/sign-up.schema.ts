import { z } from "zod";
import { emailSchema, passwordSchema } from "./common.schema";

/**
 * Sign-up form validation schema.
 */
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Type for sign-up form values.
 */
export type SignUpFormValues = z.infer<typeof signUpSchema>;
