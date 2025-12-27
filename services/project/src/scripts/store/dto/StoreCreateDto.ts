import { z } from "zod";
import type { StoreStatus, CurrencyCode, LocaleCode } from "../../../repositories/models/index.js";
import type { StorePayload } from "./shared.js";

/**
 * Store name validation schema (URL-friendly identifier)
 */
export const storeNameSchema = z
  .string()
  .min(3, "Name must be at least 3 characters")
  .max(64, "Name must be at most 64 characters")
  .regex(
    /^[a-z0-9-]+$/,
    "Name must contain only lowercase letters, numbers, and hyphens"
  )
  .refine(
    (name) => !name.startsWith("-") && !name.endsWith("-"),
    "Name cannot start or end with a hyphen"
  );

/**
 * Store create input schema
 */
export const storeCreateInputSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  /** URL-friendly identifier (e.g., "my-store") */
  name: storeNameSchema,
  /** Human-readable display name (e.g., "My Store") */
  displayName: z.string().min(1, "Display name is required").max(255),
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
  /** URL-friendly identifier (e.g., "my-store") */
  name: string;
  /** Human-readable display name (e.g., "My Store") */
  displayName: string;
  locales: LocaleCode[];
  currencies: CurrencyCode[];
  defaultCurrency: CurrencyCode;
  status?: StoreStatus;
  timezone?: string;
  email?: string | null;
}

export type StoreCreateResult = StorePayload;
