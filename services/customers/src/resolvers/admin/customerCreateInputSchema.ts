import { z } from "zod";
import { CustomerCreateInputSchema } from "./generated/schemas.js";

/**
 * Normalize values whose public contract accepts surrounding whitespace before
 * the generated scalar validators run.
 */
export function customerCreateInputSchema() {
  return CustomerCreateInputSchema().extend({
    email: z.string().trim().toLowerCase().email().nullish(),
  });
}
