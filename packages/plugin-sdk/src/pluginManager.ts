/**
 * Plugin manager: compatibility, allow-list, config migrations, validation and provider creation.
 *
 * Main responsibilities:
 * - filtering by core `allowList` and `apiVersionRange`;
 * - resolving and substituting secrets in config (`resolveSecrets`);
 * - applying plugin config migrations to current version (`applyMigrations`);
 * - config validation via `zod` (`validateConfig`);
 * - lazy call to `plugin.hooks.init(ctx)` once per plugin code (`ensureInit`);
 * - unified wrapper for operation execution via `ResilienceRunner` for `health` etc.
 */
import semver from 'semver';
import { z } from 'zod';
import { collectMissingSecrets, substituteSecrets } from './secrets';
import { ResilienceRunner, type ServiceError } from './runner';
import type { BasePluginManifest } from './types';

export type ValidatedConfig<T> = { success: true; data: T } | { success: false; errors: Array<{ path: string; message: string }> };

export type SchemaLike<T> = z.ZodType<T>;

export type CorePluginManifest = BasePluginManifest;

/**
 * Main plugin contract: manifest description, config schema, hooks and provider factory.
 */
export type CorePlugin<TConfig, TContext, TProvider> = Readonly<{
  manifest: CorePluginManifest;
  configSchema: SchemaLike<TConfig>;
  hooks?: Partial<{
    init: (ctx: TContext) => Promise<void> | void;
    healthCheck: () => Promise<{ ok: boolean; details?: Record<string, unknown> }> | { ok: boolean; details?: Record<string, unknown> };
  }>;
  migrations?: ReadonlyArray<{ from: string; to: string; migrate: (data: Record<string, unknown>) => Record<string, unknown> }>;
  create: (ctx: TContext, config: TConfig) => TProvider;
}>;

export type CorePluginModule<TConfig, TContext, TProvider> = Readonly<{ plugin: CorePlugin<TConfig, TContext, TProvider> }>;

/**
 * Validates plugin config through its `zod` schema.
 * Returns result in unified form without exceptions, suitable for external use.
 * @internal
 */
function validateConfig<T, TCtx, TProv>(plugin: CorePlugin<T, TCtx, TProv>, config: unknown): ValidatedConfig<T> {
  try {
    const parsed = (plugin.configSchema as z.ZodType<T>).parse(config) as T;
    return { success: true, data: parsed };
  } catch (e) {
    if (e instanceof z.ZodError) {
      const issues = (e as z.ZodError).issues;
      return { success: false, errors: issues.map((er) => ({ path: er.path.join('.'), message: er.message })) };
    }
    throw e;
  }
}

/**
 * Applies sequence of config migrations, starting from `fromVersion` to current plugin version.
 * Protected from migration cycles by simple step tracking.
 * @internal
 */
function applyMigrations(plugin: CorePlugin<any, any, any>, fromVersion: string | undefined, data: Record<string, unknown>): Record<string, unknown> {
  if (!plugin.migrations || plugin.migrations.length === 0 || !fromVersion) return data;
  let current = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  let currentVersion = fromVersion;
  const safety = new Set<string>();
  while (currentVersion !== plugin.manifest.version) {
    const step = plugin.migrations.find((m) => m.from === currentVersion);
    if (!step) break;
    const fingerprint = `${step.from}->${step.to}`;
    if (safety.has(fingerprint)) break;
    safety.add(fingerprint);
    current = step.migrate(current);
    currentVersion = step.to;
  }
  return current;
}

export type PluginDescriptor<TConfig, TContext, TProvider> = {
  plugin: CorePlugin<TConfig, TContext, TProvider>;
  compatible: boolean;
  allowed: boolean;
};

export class PluginManager<TConfig extends Record<string, unknown>, TContext, TProvider> {
  private readonly descriptors: PluginDescriptor<TConfig, TContext, TProvider>[];
  private readonly initialized = new Set<string>();
  protected readonly runner: ResilienceRunner;

  constructor(
    modules: readonly CorePluginModule<TConfig, TContext, TProvider>[],
    private readonly ctxFactory: (meta: { requestId?: string; userAgent?: string }) => TContext,
    options?: { allowList?: string[]; runner?: ResilienceRunner; coreApiVersion?: string }
  ) {
    const allowList = new Set((options?.allowList ?? []).map((s) => s.trim()).filter(Boolean));

    this.descriptors = modules.map((m) => {
      const p = m.plugin;
      const compatible = options?.coreApiVersion ? semver.satisfies(options.coreApiVersion, p.manifest.apiVersionRange) : true;
      const allowed = allowList.size === 0 || allowList.has(p.manifest.code);
      return { plugin: p, compatible, allowed };
    });

    this.runner = options?.runner ?? new ResilienceRunner({
      timeoutMs: 3000,
      retries: 1,
      rateLimit: 10,
      cbThreshold: 5,
      cbResetMs: 15000,
    });
  }

  /**
   * Returns list of manifests of all known plugins, including compatibility/allowance flags.
   */
  listManifests(): Array<{ manifest: CorePluginManifest; compatible: boolean; allowed: boolean }> {
    return this.descriptors.map((d) => ({ manifest: d.plugin.manifest, compatible: d.compatible, allowed: d.allowed }));
  }

  /**
   * Executes `healthCheck` for plugins in parallel via `ResilienceRunner`.
   * Errors are normalized and converted to `{ ok: false }` for specific plugin.
   */
  async health(): Promise<Array<{ code: string; ok: boolean; details?: Record<string, unknown> }>> {
    const tasks = this.descriptors.map(async (d) => {
      try {
        const res = await this.runner.execute(
          { pluginCode: d.plugin.manifest.code, operation: 'health', projectId: 'system' },
          async () => await (d.plugin.hooks?.healthCheck?.() ?? Promise.resolve(undefined)),
          { timeoutMs: 1000, retries: 0 }
        );
        if (!res) return undefined;
        return { code: d.plugin.manifest.code, ok: res.ok, details: res.details } as const;
      } catch {
        return { code: d.plugin.manifest.code, ok: false } as const;
      }
    });
    const results = await Promise.all(tasks);
    return results.filter((x): x is { code: string; ok: boolean; details?: Record<string, unknown> } => Boolean(x));
  }

  /**
   * Guarantees one-time initialization of plugin through its `init` hook.
   * Asynchronous initialization is taken into account, repeated calls are not allowed.
   * @internal
   */
  private ensureInit(plugin: CorePlugin<TConfig, TContext, TProvider>, ctx: TContext): void | Promise<void> {
    const code = plugin.manifest.code;
    if (this.initialized.has(code)) return;
    const maybe = plugin.hooks?.init?.(ctx);
    if (maybe && typeof (maybe as Promise<void>).then === 'function') {
      return (maybe as Promise<void>)
        .then(() => { this.initialized.add(code); })
        .catch((err) => { throw err; });
    }
    this.initialized.add(code);
    return;
  }

  /**
   * Finds and substitutes secrets in config, also returning list of missing keys.
   */
  resolveSecrets(config: Record<string, unknown>): { substituted: Record<string, unknown>; missing: string[] } {
    const missing = collectMissingSecrets(config);
    return { substituted: substituteSecrets(config), missing };
  }

  /**
   * Applies migrations and validates plugin config, returning unified result.
   */
  processConfig(plugin: CorePlugin<TConfig, TContext, TProvider>, rawConfig: Record<string, unknown> & { configVersion?: string }): ValidatedConfig<TConfig> {
    const migrated = applyMigrations(plugin, rawConfig.configVersion, rawConfig);
    return validateConfig<TConfig, TContext, TProvider>(plugin, migrated);
  }

  /**
   * Finds plugin descriptor by its `manifest.code`.
   */
  findDescriptor(pluginCode: string): PluginDescriptor<TConfig, TContext, TProvider> | undefined {
    return this.descriptors.find((d) => d.plugin.manifest.code === pluginCode);
  }

  /**
   * Creates plugin provider:
   * - checks presence and allowance/compatibility;
   * - substitutes secrets and validates config;
   * - creates context, guarantees initialization and calls `create`.
   *
   * In case of errors throws `ServiceError` with normalized code.
   */
  async createProvider(params: {
    pluginCode: string;
    rawConfig: (TConfig & { configVersion?: string }) | Record<string, unknown>;
    requestMeta?: { requestId?: string; userAgent?: string };
  }): Promise<{ provider: TProvider; plugin: CorePlugin<TConfig, TContext, TProvider> }>
  {
    const descriptor = this.findDescriptor(params.pluginCode);
    if (!descriptor) {
      const e: ServiceError = { code: 'CONFIG_ERROR', message: `Plugin ${params.pluginCode} not found` };
      throw e;
    }
    if (!descriptor.compatible || !descriptor.allowed) {
      const e: ServiceError = { code: 'CONFIG_ERROR', message: `Plugin ${params.pluginCode} is not allowed or incompatible` };
      throw e;
    }

    const { substituted, missing } = this.resolveSecrets(params.rawConfig as Record<string, unknown>);
    if (missing.length > 0) {
      const e: ServiceError = { code: 'CONFIG_ERROR', message: 'Missing secrets', details: { missing } };
      throw e;
    }

    const validation = this.processConfig(descriptor.plugin, substituted);
    if (!validation.success) {
      const e: ServiceError = { code: 'VALIDATION_ERROR', message: 'Invalid plugin config', details: { errors: validation.errors } };
      throw e;
    }

    const ctx = this.ctxFactory(params.requestMeta ?? {});
    await this.ensureInit(descriptor.plugin, ctx);
    const provider = descriptor.plugin.create(ctx, validation.data as TConfig);
    return { provider, plugin: descriptor.plugin };
  }
}
