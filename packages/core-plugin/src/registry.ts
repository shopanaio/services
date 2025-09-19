/**
 * Plugin registry module.
 *
 * Responsible for:
 * - discovering npm packages marked with required `keywords`,
 * - generating registry source code that correctly imports modules and collects them into a list,
 * - writing generated file to specified project directory.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { createRequire } from 'module';

/**
 * Options for generating plugin registry file.
 */
export type GeneratePluginsOptions = Readonly<{
  appRoot: string;
  outDir?: string; // default: src/plugins
  outFileName?: string; // default: generated.ts
  keywords?: string[]; // default: ['portal-plugin'] + domain-specific provided by caller
  explicitList?: string[]; // explicit package names list
  typeImportFrom?: string; // e.g. '@shopana/<domain>-plugin-kit'
}>;

/**
 * Simplified `package.json` representation with only fields used for discovery.
 */
type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  keywords?: string[];
};

/**
 * Returns array of unique values, preserving order of first occurrences.
 * @internal
 */
function unique<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

/**
 * Checks if keyword list contains all required keywords (case insensitive).
 * @internal
 */
function isPluginKeywords(keywords: string[] | undefined, required: string[]): boolean {
  if (!keywords || keywords.length === 0) return false;
  const set = new Set(keywords.map((k) => k.toLowerCase()));
  return required.every((k) => set.has(k.toLowerCase()));
}

/**
 * Reads JSON file at path and parses its content.
 * @param filePath Absolute path to file.
 * @internal
 */
async function readJson(filePath: string): Promise<any> {
  const buf = await fs.readFile(filePath, 'utf8');
  return JSON.parse(buf);
}

/**
 * Tries to resolve path to `package.json` for specified package candidate considering `appRoot`.
 * Returns `undefined` if package cannot be found via `require.resolve`.
 * @internal
 */
async function resolvePackageJson(req: NodeRequire, appRoot: string, candidate: string): Promise<string | undefined> {
  try {
    const resolved = req.resolve(path.join(candidate, 'package.json'), { paths: [appRoot] } as any);
    return resolved;
  } catch {
    return undefined;
  }
}

/**
 * Discovers plugin packages by keywords among application dependencies.
 *
 * Search sources: `dependencies`, `optionalDependencies` and/or explicit list `explicitList`.
 * Package is considered a plugin if its `package.json.keywords` contains all keywords `opts.keywords`.
 *
 * @param opts Discovery settings.
 * @returns List of package names that meet the criteria.
 */
export async function discoverPluginPackages(opts: { appRoot: string; keywords: string[]; explicitList?: string[] }): Promise<string[]> {
  const req = createRequire(import.meta.url);
  const pkgPath = path.join(opts.appRoot, 'package.json');
  const pkg: PackageJson = await readJson(pkgPath);
  const candidates = opts.explicitList ?? unique([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
  ]);
  const result: string[] = [];
  for (const name of candidates) {
    const pj = await resolvePackageJson(req, opts.appRoot, name);
    if (!pj) continue;
    const json: PackageJson = await readJson(pj);
    if (isPluginKeywords(json.keywords, opts.keywords)) result.push(name);
  }
  return unique(result);
}

/**
 * Generates TypeScript source code that imports found plugin modules and forms `plugins` array.
 * If `typeImportFrom` is specified, adds `PluginModule` type import and strict typing of result.
 *
 * In resulting code, `plugin` export is taken from module (or `default.plugin`).
 *
 * @param packageNames Names of npm packages with plugins.
 * @param typeImportFrom Optional module from which `PluginModule` type is imported.
 */
export function generateRegistrySource(packageNames: string[], typeImportFrom?: string): string {
  const header = `// @generated — DO NOT EDIT\n// source: dependencies/optionalDependencies + explicit list\n`;
  const imports = packageNames.map((name, i) => `import * as mod${i} from '${name}';`).join('\n');
  const modulesArr = packageNames.map((_, i) => `  mod${i}`).join(',\n');
  const typeImport = typeImportFrom ? `import type { PluginModule } from '${typeImportFrom}';\n` : '';
  const typeGuard = typeImportFrom
    ? `function isPlugin(x: unknown): x is PluginModule['plugin'] {\n  return Boolean(x) && typeof x === 'object'\n    && 'manifest' in (x as object)\n    && 'create' in (x as object)\n    && 'configSchema' in (x as object);\n}`
    : `function isPlugin(x: unknown): x is { manifest: unknown; create: unknown } {\n  return Boolean(x) && typeof x === 'object' && 'manifest' in (x as object) && 'create' in (x as object);\n}`;
  const body = `
${typeImport}
const modules = [
${modulesArr}
] as const;

function pickPlugin(mod: unknown): unknown {
  const anyMod = mod as { plugin?: unknown; default?: { plugin?: unknown } };
  return anyMod?.plugin ?? anyMod?.default?.plugin;
}

${typeGuard}

const discovered = modules.map(pickPlugin).filter(isPlugin);

export const plugins${typeImportFrom ? `: PluginModule[]` : ''} = discovered.map((p) => ({ plugin: p }));
`;
  return `${header}\n${imports}\n${body}`;
}

/**
 * Discovers plugins and creates registry file with imports on disk.
 *
 * By default file is created in `src/plugins/generated.ts` relative to `appRoot`.
 *
 * @param options Generation parameters (project root, directory/filename, keywords etc.).
 * @returns Path to created file and number of discovered packages.
 */
export async function generatePluginsFile(options: GeneratePluginsOptions): Promise<{ outFile: string; count: number }> {
  const appRoot = options.appRoot;
  const outDir = options.outDir ?? path.join('src', 'plugins');
  const outFileName = options.outFileName ?? 'generated.ts';
  const keywords = options.keywords && options.keywords.length > 0 ? options.keywords : ['portal-plugin'];
  const explicit = options.explicitList;

  const packages = await discoverPluginPackages({ appRoot, keywords, explicitList: explicit });
  const outAbsDir = path.join(appRoot, outDir);
  const outFile = path.join(outAbsDir, outFileName);
  await fs.mkdir(outAbsDir, { recursive: true });
  const content = generateRegistrySource(packages, options.typeImportFrom);
  await fs.writeFile(outFile, content, 'utf8');
  return { outFile, count: packages.length };
}
