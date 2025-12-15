/**
 * Custom ESM loader that resolves @src/* and @domain/* imports based on file location
 * Must be loaded BEFORE ts-node/esm
 */
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { existsSync, statSync } from 'fs';

// Map service directories that use path aliases
const servicesWithAliases = ['checkout', 'orders', 'apps'];

function resolveAliasPath(specifier, parentPath) {
  // Handle @src/* and @domain/*
  let aliasMatch = null;
  let aliasPrefix = '';

  if (specifier.startsWith('@src/')) {
    aliasMatch = specifier.slice(5);
    aliasPrefix = 'src';
  } else if (specifier.startsWith('@domain/')) {
    aliasMatch = specifier.slice(8);
    aliasPrefix = 'src/domain';
  }

  if (!aliasMatch) return null;

  // Find which service this file belongs to
  for (const service of servicesWithAliases) {
    const servicePattern = `/services/${service}/`;
    if (parentPath.includes(servicePattern)) {
      const serviceRoot = parentPath.split(servicePattern)[0] + servicePattern;
      let targetPath = join(serviceRoot, aliasPrefix, aliasMatch);

      // Handle .js imports that should resolve to .ts files
      if (targetPath.endsWith('.js')) {
        const tsPath = targetPath.slice(0, -3) + '.ts';
        if (existsSync(tsPath)) {
          return pathToFileURL(tsPath).href;
        }
      }

      // Try different resolutions
      const attempts = [
        targetPath,
        targetPath + '.ts',
        targetPath + '.js',
        targetPath + '.json',
        join(targetPath, 'index.ts'),
        join(targetPath, 'index.js'),
      ];

      for (const attempt of attempts) {
        if (existsSync(attempt) && !statSync(attempt).isDirectory()) {
          return pathToFileURL(attempt).href;
        }
      }

      // If path exists as directory, try index
      if (existsSync(targetPath) && statSync(targetPath).isDirectory()) {
        for (const indexFile of ['index.ts', 'index.js']) {
          const indexPath = join(targetPath, indexFile);
          if (existsSync(indexPath)) {
            return pathToFileURL(indexPath).href;
          }
        }
      }
    }
  }

  return null;
}

export async function resolve(specifier, context, nextResolve) {
  const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();

  // Try to resolve aliases
  const resolved = resolveAliasPath(specifier, parentPath);
  if (resolved) {
    return { url: resolved, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
