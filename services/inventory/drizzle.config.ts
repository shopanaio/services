import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/repositories/models/index.ts",
  out: "./migrations",
  dialect: "postgresql",
});
