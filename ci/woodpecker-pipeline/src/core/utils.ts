import { promisify } from 'util';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);

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
 * Clone and checkout the repository into a temporary directory.
 */
export async function ensureRepoCheckedOut(repoSlug: string, commitSha: string, token: string): Promise<string> {
  const workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'repo-'));
  const httpsUrl = `https://x-token-auth:${token}@bitbucket.org/${repoSlug}.git`;
  await execFileAsync('git', ['clone', '--quiet', httpsUrl, workdir]);
  await execFileAsync('git', ['-C', workdir, 'checkout', '--quiet', commitSha]);
  return workdir;
}

/**
 * Recursively find all test spec files under tests/ and return paths relative to tests/.
 */
export async function findSpecFiles(tmpRepoDir: string): Promise<string[]> {
  const testsRoot = path.join(tmpRepoDir, 'tests');
  const result: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
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
