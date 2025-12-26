import { z } from "zod";
import type { StoreStatus, CurrencyCode, LocaleCode } from "../../../repositories/models/index.js";
import type { StorePayload } from "./shared.js";

/**
 * Store slug validation schema
 */
export const storeSlugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(64, "Slug must be at most 64 characters")
  .regex(
    /^[a-z0-9-]+$/,
    "Slug must contain only lowercase letters, numbers, and hyphens"
  )
  .refine(
    (slug) => !slug.startsWith("-") && !slug.endsWith("-"),
    "Slug cannot start or end with a hyphen"
  );

/**
 * Store create input schema
 */
export const storeCreateInputSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  name: z.string().min(1, "Name is required").max(255),
  slug: storeSlugSchema,
  locales: z.array(z.string()).min(1, "At least one locale is required"),
  currencies: z.array(z.string()).min(1, "At least one currency is required"),
  defaultCurrency: z.string().min(1, "Default currency is required"),
  status: z.enum(["active", "inactive"]).optional(),
  timezone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().nullable(),
});

export type StoreCreateInput = z.infer<typeof storeCreateInputSchema>;

export interface StoreCreateParams {
  organizationId: string;
  name: string;
  slug: string;
  locales: LocaleCode[];
  currencies: CurrencyCode[];
  defaultCurrency: CurrencyCode;
  status?: StoreStatus;
  timezone?: string;
  email?: string | null;
}

export type StoreCreateResult = StorePayload;
