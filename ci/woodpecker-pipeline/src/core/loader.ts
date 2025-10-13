import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { PipelineScript } from './types';

/**
 * Dynamically loads all pipeline scripts from the scripts directory.
 * A script module may export one or more classes that implement PipelineScript.
 */
export async function loadScripts(): Promise<PipelineScript[]> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const scriptsRootDir = path.resolve(__dirname, '..', 'scripts');

  async function dirExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  if (!(await dirExists(scriptsRootDir))) {
    return [];
  }

  // Рекурсивно собираем .ts/.js файлы из scripts/**
  const filesSet = new Set<string>();
  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
        filesSet.add(full);
      }
    }
  }
  await walk(scriptsRootDir);

  const scripts: PipelineScript[] = [];
  for (const file of filesSet) {
    const mod = await import(pathToFileURL(file).href);
    for (const key of Object.keys(mod)) {
      const ctor = mod[key as keyof typeof mod] as unknown;
      if (typeof ctor !== 'function') continue;
      const instance = new (ctor as new () => unknown)();
      const candidate = instance as PipelineScript;
      if (
        candidate &&
        typeof candidate.getName === 'function' &&
        typeof candidate.supports === 'function' &&
        typeof candidate.build === 'function'
      ) {
        scripts.push(candidate);
      }
    }
  }

  return scripts;
}
