/**
 * Universal wrapper for resilient execution of plugin operations.
 *
 * Combines:
 * - execution timeouts;
 * - retries with exponential backoff;
 * - rate limiting based on partition key (plugin/operation/project);
 * - circuit breaker for isolating degrading operations;
 * - error normalization to unified `ServiceError`.
 */
import Bottleneck from 'bottleneck';
import { handleAll, wrap, circuitBreaker, ConsecutiveBreaker, isBrokenCircuitError } from 'cockatiel';

export type ServiceError = Readonly<{
  code: 'VALIDATION_ERROR' | 'PLUGIN_ERROR' | 'TIMEOUT' | 'RATE_LIMIT' | 'CIRCUIT_OPEN' | 'CONFIG_ERROR';
  message: string;
  details?: Record<string, unknown>;
  plugin?: string;
  operation?: string;
}>;

export type RunnerMeta = Readonly<{
  pluginCode: string;
  operation: string;
  projectId: string;
}>;

export type RunnerOptions = Readonly<{
  timeoutMs: number;
  retries: number;
  rateLimit: number;
  cbThreshold: number;
  cbResetMs: number;
}>;

export class TimeoutError extends Error {
  constructor(message = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
function computeBackoffMs(attempt: number): number { const base = 200 * Math.pow(2, attempt); return Math.floor(Math.random() * base); }
/**
 * Wraps function in timeout on promises without canceling the actual execution (best-effort).
 */
async function withTimeout<T>(promiseFactory: () => Promise<T>, timeoutMs: number): Promise<T> {
  if (timeoutMs <= 0) return promiseFactory();
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promiseFactory(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const stopRetryCodes = new Set(['TIMEOUT', 'CIRCUIT_OPEN', 'VALIDATION_ERROR', 'CONFIG_ERROR']);
/**
 * Forms partition key for limiter/breaker.
 */
function buildPartitionKey(meta: RunnerMeta): string { return `${meta.pluginCode}:${meta.operation}:${meta.projectId}`; }

export class ResilienceRunner {
  private readonly keyToLimiter = new Map<string, Bottleneck>();
  private readonly keyToBreakerPolicy = new Map<string, { execute: <T>(fn: () => Promise<T>) => Promise<T> }>();
  constructor(private readonly defaults: RunnerOptions) {
  }
  /**
   * Executes operation with limits, retries, timeout and circuit breaker applied.
   * Parameters can be overridden through `overrides`.
   */
  async execute<T>(meta: RunnerMeta, operation: () => Promise<T>, overrides?: Partial<RunnerOptions>): Promise<T> {
    const cfg: RunnerOptions = { ...this.defaults, ...(overrides ?? {}) };
    const key = buildPartitionKey(meta);
    const limiter = this.getOrCreateLimiterForKey(key, cfg.rateLimit);
    const breakerPolicy = this.getOrCreateBreakerPolicyForKey(key, cfg.cbThreshold, cfg.cbResetMs);

    return await limiter.schedule(async () => {
      const attempts = Math.max(0, cfg.retries) + 1;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          const result = await breakerPolicy.execute(() => withTimeout(operation, cfg.timeoutMs));
          return result;
        } catch (err) {
          const normalized = this.normalizeError(err, meta);
          if (attempt < attempts - 1 && !stopRetryCodes.has(normalized.code)) {
            await sleep(computeBackoffMs(attempt));
            continue;
          }
          throw normalized;
        }
      }
      throw new Error('ResilienceRunner: exhausted attempts without result');
    });
  }
  /**
   * Converts various library/plugin errors to unified `ServiceError` format.
   */
  private normalizeError(err: unknown, meta: RunnerMeta): ServiceError {
    // Timeout from our own error
    if (err instanceof TimeoutError || (err && typeof err === 'object' && (err as any).name === 'TimeoutError')) {
      return { code: 'TIMEOUT', message: (err as any).message ?? 'Operation timed out', plugin: meta.pluginCode, operation: meta.operation };
    }
    // Cockatiel BrokenCircuitError
    if (isBrokenCircuitError(err) || (err && typeof err === 'object' && (err as any).name === 'BrokenCircuitError')) {
      return { code: 'CIRCUIT_OPEN', message: 'Circuit breaker is open', plugin: meta.pluginCode, operation: meta.operation };
    }
    // Bottleneck overflow
    if (err && typeof err === 'object' && (err as any).name === 'BottleneckError') {
      return { code: 'RATE_LIMIT', message: 'Rate limit queue overflow', plugin: meta.pluginCode, operation: meta.operation };
    }
    const maybe = err as Partial<ServiceError> | undefined;
    if (maybe && typeof maybe === 'object' && maybe.code && maybe.message) {
      return {
        code: maybe.code as ServiceError['code'],
        message: String(maybe.message),
        details: maybe.details,
        plugin: maybe.plugin ?? meta.pluginCode,
        operation: maybe.operation ?? meta.operation,
      };
    }
    return { code: 'PLUGIN_ERROR', message: err instanceof Error ? err.message : 'Unknown provider error', plugin: meta.pluginCode, operation: meta.operation };
  }

  private getOrCreateLimiterForKey(key: string, maxConcurrent: number): Bottleneck {
    const existing = this.keyToLimiter.get(key);
    if (existing) { existing.updateSettings({ maxConcurrent }); return existing; }
    const limiter = new Bottleneck({ maxConcurrent, highWater: 1000, strategy: Bottleneck.strategy.OVERFLOW });
    this.keyToLimiter.set(key, limiter);
    return limiter;
  }

  private getOrCreateBreakerPolicyForKey(key: string, threshold: number, resetMs: number): { execute: <T>(fn: () => Promise<T>) => Promise<T> } {
    const existing = this.keyToBreakerPolicy.get(key);
    if (existing) return existing;
    const base = handleAll;
    const breaker = circuitBreaker(base, { halfOpenAfter: resetMs, breaker: new ConsecutiveBreaker(threshold) });
    const policy = wrap(breaker);
    this.keyToBreakerPolicy.set(key, policy);
    return policy;
  }
}

/**
 * Creates `ResilienceRunner`, reading configuration from environment variables with given prefix.
 * Useful for CLI/microservices without complex configuration.
 */
export function createResilienceRunnerFromEnv(
  env: Record<string, string | undefined>,
  prefix = 'PLUGIN_',
): ResilienceRunner {
  const read = (name: string, def: number): number => Number(env[prefix + name] ?? def);
  return new ResilienceRunner({
    timeoutMs: read('TIMEOUT_MS', 3000),
    retries: read('RETRIES', 1),
    rateLimit: read('RATELIMIT', 10),
    cbThreshold: read('CB_THRESHOLD', 5),
    cbResetMs: read('CB_RESET_MS', 15000),
  });
}

/**
 * Utility wrapper for uniform execution of operations through already created `ResilienceRunner`.
 */
export async function executeWithRunner<T>(
  runner: ResilienceRunner,
  meta: RunnerMeta,
  operation: () => Promise<T>,
): Promise<T> {
  return runner.execute<T>(meta, operation);
}
