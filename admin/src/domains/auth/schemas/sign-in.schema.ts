import { z } from "zod";
import { emailSchema, passwordSchema } from "./common.schema";

/**
 * Sign-in form validation schema.
 */
export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean(),
});

/**
 * Type for sign-in form values.
 */
export type SignInFormValues = z.infer<typeof signInSchema>;
