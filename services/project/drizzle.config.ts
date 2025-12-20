import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/repositories/models/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
});
