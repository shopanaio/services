import { z } from "zod";

export const createCustomerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Enter a valid email address").max(254),
  phoneE164: z.string().trim().max(40, "Phone number is too long"),
  preferredLocale: z.string().min(1, "Locale is required"),
});

export type CreateCustomerFormValues = z.infer<typeof createCustomerSchema>;
