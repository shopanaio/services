import { customType, pgSchema } from "drizzle-orm/pg-core";

export const headlessSchema = pgSchema("app_shopana_headless");

export const bytea = customType<{
  data: Uint8Array;
  driverData: Uint8Array;
}>({
  dataType() {
    return "bytea";
  },
});
