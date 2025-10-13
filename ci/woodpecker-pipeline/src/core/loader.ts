import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { PipelineScript } from './types';

/**
 * Dynamically loads all pipeline scripts from the scripts directory.
 * A script module may export one or more classes that implement PipelineScript.
 */
export async function loadScripts(repoSlug: string): Promise<PipelineScript[]> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const scriptsDir = path.resolve(__dirname, '..', 'scripts');
  const dir = path.join(scriptsDir, ...repoSlug.split('/'));

  let entries: import('fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = entries
    .filter((e) => e.isFile() && (e.name.endsWith('.js') || e.name.endsWith('.ts')))
    .map((e) => path.join(dir, e.name));

  const scripts: PipelineScript[] = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(file).href);
    for (const key of Object.keys(mod)) {
      const ctor = mod[key as keyof typeof mod] as unknown;
      if (typeof ctor !== 'function') continue;
      const instance = new (ctor as new () => unknown)();
      const candidate = instance as PipelineScript;
      if (candidate && typeof candidate.getName === 'function' && typeof candidate.supports === 'function' && typeof candidate.build === 'function') {
        scripts.push(candidate);
      }
    }
  }

  return scripts;
}
