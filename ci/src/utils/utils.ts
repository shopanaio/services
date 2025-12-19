import fs from "fs/promises";
import path from "path";

/**
 * Split an array into chunks of a given size.
 */
export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  return items.reduce<T[][]>((acc, item, index) => {
    if (index % chunkSize === 0) {
      acc.push([item]);
    } else {
      acc[acc.length - 1].push(item);
    }
    return acc;
  }, []);
}

/**
 * Recursively find all test spec files under tests/ and return paths relative to tests/.
 */
export async function findSpecFiles(tempRepoDir: string): Promise<string[]> {
  const testsRoot = path.join(tempRepoDir, "tests");
  const result: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".spec.ts")) {
        const relativeFromTests = path.relative(testsRoot, fullPath);
        result.push(relativeFromTests);
      }
    }
  }

  try {
    await walk(testsRoot);
  } catch {
    // tests directory may not exist
  }

  return result.sort();
}
