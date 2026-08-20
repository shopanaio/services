import { MCPTool } from "mcp-framework";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import { BUILD_SERVICE_NAMES, formatServiceNames } from "../serviceNames.js";

const execAsync = promisify(exec);

const BuildToolSchema = z.object({
  services: z
    .array(z.string().min(1))
    .optional()
    .describe(
      `Specific service(s) or hosted App(s) to build. Services: ${formatServiceNames(BUILD_SERVICE_NAMES)}`,
    ),
  packagesOnly: z.boolean().optional().describe("Build only packages (shared libraries)"),
  parallel: z.boolean().optional().describe("Build services in parallel for faster builds"),
  workingDir: z.string().optional().describe("Working directory (defaults to current directory)"),
});

class BuildTool extends MCPTool<typeof BuildToolSchema> {
  name = "shopana_build";
  description = `Build Shopana packages and services for production.

Prettier checks formatting before lint and fails the build on unformatted files.
Oxlint runs after formatting and fails the build on lint errors.
TypeScript type checking runs after lint and fails the build on type errors.

Examples:
- Build everything: {}
- Build packages only: { "packagesOnly": true }
- Build specific services: { "services": ["checkout", "orders"] }
- Build in parallel: { "parallel": true }

Available services are discovered dynamically; hosted Apps under apps/* are also accepted.`;

  schema = BuildToolSchema;

  async execute(input: z.infer<typeof BuildToolSchema>) {
    const { services, packagesOnly, parallel, workingDir } = input;

    let command = "yarn shopana build";

    if (packagesOnly) {
      command += " --packages";
    } else if (services && services.length > 0) {
      command += ` -s ${services.join(" ")}`;
    }

    if (parallel) {
      command += " --parallel";
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir || process.cwd(),
        timeout: 300000, // 5 minutes timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                command,
                output: stdout,
                warnings: stderr || undefined,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: false,
                command,
                error: error.message,
                stdout: error.stdout,
                stderr: error.stderr,
              },
              null,
              2,
            ),
          },
        ],
      };
    }
  }
}

export default BuildTool;
