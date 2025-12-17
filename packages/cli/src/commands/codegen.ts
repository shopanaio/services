import chalk from "chalk";
import { runCodegen } from "../scripts/codegen.js";

interface CodegenOptions {
  service?: string;
}

export async function codegenCommand(options: CodegenOptions) {
  console.log(chalk.cyan("\n🔧 GraphQL Codegen\n"));
  await runCodegen(options.service);
}
