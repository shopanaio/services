import chalk from "chalk";
import { runOpenApiGeneration } from "../scripts/openapi.js";

interface OpenApiOptions {
  service?: string;
}

export async function openApiCommand(options: OpenApiOptions) {
  console.log(chalk.cyan("\n📘 OpenAPI generation\n"));
  await runOpenApiGeneration(options.service);
}
