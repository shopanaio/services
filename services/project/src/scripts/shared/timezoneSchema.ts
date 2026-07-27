import { z } from "zod";

export const timezoneSchema = z
  .string()
  .trim()
  .min(1, "Timezone is required")
  .max(64)
  .refine((timezone) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA timezone");
