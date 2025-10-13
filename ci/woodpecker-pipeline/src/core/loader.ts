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
  const scriptsRootDir = path.resolve(__dirname, '..', 'scripts');

  async function dirExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  // 1) Общие скрипты по умолчанию: scripts/services
  const commonDir = path.join(scriptsRootDir, 'services');
  // 2) Репо-специфичные (если есть): scripts/<workspace>/<repo>
  const repoSpecificDir = path.join(scriptsRootDir, ...repoSlug.split('/'));

  const searchDirs: string[] = [];
  if (await dirExists(commonDir)) searchDirs.push(commonDir);
  if (await dirExists(repoSpecificDir)) searchDirs.push(repoSpecificDir);

  if (searchDirs.length === 0) {
    return [];
  }

  // Собираем файлы .ts/.js из всех доступных директорий (без дублей)
  const filesSet = new Set<string>();
  for (const dir of searchDirs) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!e.name.endsWith('.js') && !e.name.endsWith('.ts')) continue;
      filesSet.add(path.join(dir, e.name));
    }
  }

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
