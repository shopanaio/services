import { existsSync } from "fs";
import { join, dirname } from "path";

/**
 * Find the root directory of the monorepo
 * Looks for package.json with workspaces field
 */
export function findRootDir(): string {
  let dir = process.cwd();

  while (dir !== "/") {
    const packageJsonPath = join(dir, "package.json");

    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(
          require("fs").readFileSync(packageJsonPath, "utf-8")
        );

        // Check if this is the root (has workspaces)
        if (pkg.workspaces) {
          return dir;
        }
      } catch {
        // Continue searching
      }
    }

    dir = dirname(dir);
  }

  // Fallback to current directory
  return process.cwd();
}

/**
 * Format duration in human readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}
