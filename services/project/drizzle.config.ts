import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/repositories/models/*.ts",
  out: "./migrations",
  dialect: "postgresql",
});
