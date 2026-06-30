import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

function hasWorkspacePackageJson(dir: string) {
  const packageJsonPath = join(dir, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return Boolean(packageJson.workspaces);
  } catch {
    return false;
  }
}

export function findRepoRoot(startDir = process.cwd()) {
  let dir = startDir;

  while (dir !== dirname(dir)) {
    if (hasWorkspacePackageJson(dir)) {
      return dir;
    }

    dir = dirname(dir);
  }

  if (hasWorkspacePackageJson(dir)) {
    return dir;
  }

  return startDir;
}

export function resolveRepoRoot(workingDir?: string) {
  return findRepoRoot(workingDir || process.cwd());
}

export function resolveE2eDir(workingDir?: string) {
  const repoRoot = resolveRepoRoot(workingDir);
  const e2eDir = join(repoRoot, 'e2e');

  if (!existsSync(join(e2eDir, 'playwright.config.ts'))) {
    throw new Error(`Playwright config not found in ${e2eDir}`);
  }

  return e2eDir;
}
