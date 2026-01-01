import type {
  AfterCreateContext,
  AfterLoadContext,
  ExecutorOptions,
  MiddlewareResult,
  MiddlewareStack,
  QueryArgs,
  TypeClass,
} from "./types.js";
import { BaseType } from "./baseType.js";

/**
 * Infers the result type from a BaseType instance.
 * Maps resolver methods to their return types.
 */
type InstanceResult<T> = {
  [K in keyof T as T[K] extends (...args: unknown[]) => unknown
    ? K extends "constructor" | "$preload" | "$get" | "$data"
      ? never
      : K
    : never]: T[K] extends (...args: unknown[]) => infer R ? Awaited<R> : never;
};

/**
 * Error thrown when a resolver fails.
 * Contains additional context about which field and type failed.
 */
export class ResolverError extends Error {
  readonly field: string;
  readonly type: string;
  readonly originalError?: unknown;

  constructor(
    message: string,
    options: { cause?: unknown; field: string; type: string }
  ) {
    super(message);
    this.name = "ResolverError";
    this.field = options.field;
    this.type = options.type;
    this.originalError = options.cause;
  }
}

/**
 * Executor class for recursive data resolution.
 * Similar to GraphQL resolution but without GraphQL.
 * Uses classes as types where each method is a resolver.
 *
 * When query is provided, only requested fields are resolved (like GraphQL).
 * Supports aliases via `fieldName` property in populate entries.
 *
 * @template TContext - The type of the context object passed to type instances
 */
export class Executor<TContext = unknown> {
  private readonly middleware: MiddlewareStack<TContext>;

  constructor(private options: ExecutorOptions<TContext> = {}) {
    this.middleware = options.middleware ?? [];
  }

  /**
   * Execute afterCreate hooks on all middleware.
   * Returns null if any middleware returns null (short-circuit).
   */
  private async runAfterCreate(
    ctx: AfterCreateContext<TContext>
  ): Promise<MiddlewareResult> {
    for (const mw of this.middleware) {
      if (mw.afterCreate) {
        const result = await mw.afterCreate(ctx);
        if (result === null) {
          return null;
        }
      }
    }
  }

  /**
   * Execute afterLoad hooks on all middleware.
   * Returns null if any middleware returns null (short-circuit).
   */
  private async runAfterLoad(
    ctx: AfterLoadContext<TContext>
  ): Promise<MiddlewareResult> {
    for (const mw of this.middleware) {
      if (mw.afterLoad) {
        const result = await mw.afterLoad(ctx);
        if (result === null) {
          return null;
        }
      }
    }
  }

  /**
   * Resolves an instance through its resolver methods
   * and recursively resolving nested types.
   *
   * @param instance - The BaseType instance to resolve
   * @param query - Optional QueryArgs specifying which fields to resolve.
   *                When provided, only requested fields are resolved.
   * @returns The fully resolved object with all fields
   */
  async load<T extends BaseType<unknown, unknown, TContext>>(
    instance: T,
    query?: QueryArgs
  ): Promise<InstanceResult<T>> {
    const Type = instance.constructor as TypeClass;
    const value = (instance as any).$props;

    // Build middleware context (ctx from instance, not options)
    const middlewareCtx: AfterCreateContext<TContext> = {
      Type,
      value,
      query,
      ctx: (instance as any).ctx as TContext,
      instance,
    };

    // Run afterCreate middleware (e.g., authorization)
    const afterCreateResult = await this.runAfterCreate(middlewareCtx);
    if (afterCreateResult === null) {
      return null as unknown as InstanceResult<T>;
    }

    // Check if $preload returns null - if so, return null immediately
    if (typeof (instance as any).$preload === "function") {
      const data = await (instance as any).$preload();
      if (data === null || data === undefined) {
        return null as unknown as InstanceResult<T>;
      }
    }

    const result: Record<string, unknown> = {};

    // Collect all fields to resolve
    const fieldsToResolve = new Set<string>();

    // 1. Add scalar fields from fields array
    if (query?.fields) {
      for (const field of query.fields) {
        fieldsToResolve.add(field);
      }
    }

    // 2. Add relation fields from populate
    if (query?.populate) {
      for (const field of Object.keys(query.populate)) {
        fieldsToResolve.add(field);
      }
    }

    // 3. If query is not specified - resolve ALL methods (backwards compat)
    if (!query) {
      throw new Error(
        `[type-resolver] QueryArgs must be provided to resolve all fields on ${Type.name}.`
      );
    }

    // Warn if query was provided but no fields to resolve (likely parseGraphqlInfo path mismatch)
    if (query && fieldsToResolve.size === 0) {
      console.warn(
        `[type-resolver] No fields to resolve for ${Type.name}. ` +
          `Query was provided but fields/populate are empty. ` +
          `Check parseGraphqlInfo fieldName parameter - it should match the field path in your GraphQL query.`
      );
    }

    // Resolve fields
    await Promise.all(
      Array.from(fieldsToResolve).map(async (key) => {
        try {
          // Get config for field from populate (if exists)
          const fieldQuery = query?.populate?.[key];

          // Alias support: fieldName specifies the real method
          const methodName = fieldQuery?.fieldName ?? key;

          // Args for method
          const argsForField = fieldQuery?.args;

          const method = (instance as any)[methodName];
          if (typeof method !== "function") return;

          // Call resolver method
          const resolved = await method.call(instance, argsForField);

          // Check if resolved value is a BaseType instance (relation field)
          if (
            Array.isArray(resolved) &&
            resolved[0] instanceof BaseType &&
            fieldQuery
          ) {
            // Array of BaseType instances - recursively resolve each
            result[key] = await Promise.all(
              resolved.map((item) => this.load(item, fieldQuery))
            );
          } else if (resolved instanceof BaseType && fieldQuery) {
            // Single BaseType instance - recursively resolve
            result[key] = await this.load(resolved, fieldQuery);
          } else {
            // Scalar field or relation without query
            result[key] = resolved;
          }
        } catch (error) {
          switch (this.options.onError) {
            case "null":
              result[key] = null;
              break;
            case "partial":
              result[key] = { __error: (error as Error).message };
              break;
            case "throw":
            default:
              throw new ResolverError(
                `Failed to resolve field "${key}" on ${Type.name}`,
                { cause: error, field: key, type: Type.name }
              );
          }
        }
      })
    );

    // Run afterLoad middleware (e.g., result transformation)
    const afterLoadCtx: AfterLoadContext<TContext> = {
      ...middlewareCtx,
      result,
    };
    const afterLoadResult = await this.runAfterLoad(afterLoadCtx);
    if (afterLoadResult === null) {
      return null as unknown as InstanceResult<T>;
    }

    return afterLoadCtx.result as InstanceResult<T>;
  }

  /**
   * Resolves an array of instances.
   *
   * @param instances - The BaseType instances to resolve
   * @param query - Optional QueryArgs specifying which fields to resolve
   */
  async loadMany<T extends BaseType<unknown, unknown, TContext>>(
    instances: T[],
    query?: QueryArgs
  ): Promise<InstanceResult<T>[]> {
    return Promise.all(instances.map((instance) => this.load(instance, query)));
  }

  /**
   * Universal resolver for any value type.
   * Handles: BaseType, Array<BaseType>, plain objects, scalars.
   *
   * @param value - Any value to resolve
   * @param query - QueryArgs specifying which fields to resolve
   * @returns Resolved value according to query
   */
  async resolve(value: unknown, query?: QueryArgs): Promise<unknown> {
    // 1. BaseType instance → load(instance, query)
    if (value instanceof BaseType) {
      return this.load(value, query);
    }

    // 2. Array of BaseType → loadMany(instances, query)
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      value[0] instanceof BaseType
    ) {
      return this.loadMany(value, query);
    }

    // 3. Plain object → resolve each field by query
    if (
      value !== null &&
      typeof value === "object" &&
      !(value instanceof Date)
    ) {
      return this.resolveObject(value as Record<string, unknown>, query);
    }

    // 4. Scalar → return as is
    return value;
  }

  /**
   * Resolves a plain object by iterating over query fields.
   * For each field, recursively calls resolve() on the value.
   *
   * @param obj - Plain object to resolve
   * @param query - QueryArgs specifying which fields to resolve
   * @returns Resolved object with only requested fields
   */
  private async resolveObject(
    obj: Record<string, unknown>,
    query?: QueryArgs
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    // Collect fields to resolve from query
    const fieldsToResolve = new Set<string>();
    if (query?.fields) {
      for (const field of query.fields) {
        fieldsToResolve.add(field);
      }
    }
    if (query?.populate) {
      for (const field of Object.keys(query.populate)) {
        fieldsToResolve.add(field);
      }
    }

    // If no query specified, return empty object
    if (fieldsToResolve.size === 0) {
      return result;
    }

    // Resolve each requested field in parallel
    await Promise.all(
      Array.from(fieldsToResolve).map(async (key) => {
        const value = obj[key];
        const fieldQuery = query?.populate?.[key];
        result[key] = await this.resolve(value, fieldQuery);
      })
    );

    return result;
  }
}

/**
 * Creates a new executor with custom options.
 *
 * @template TContext - The type of the context object
 * @param options - Configuration options for the executor
 * @returns A new Executor instance
 */
export function createExecutor<TContext = unknown>(
  options: ExecutorOptions<TContext>
): Executor<TContext> {
  return new Executor(options);
}

/**
 * Load and resolve a BaseType instance.
 *
 * @param instance - The BaseType instance to resolve
 * @param query - Optional QueryArgs (use parseGraphqlInfo to convert from GraphQL info)
 */
export function load<T extends BaseType<unknown, unknown, unknown>>(
  instance: T,
  query?: QueryArgs
): Promise<InstanceResult<T>> {
  const exec = new Executor({});
  return exec.load(instance, query);
}

/**
 * Load and resolve multiple BaseType instances.
 *
 * @param instances - The BaseType instances to resolve
 * @param query - Optional QueryArgs (use parseGraphqlInfo to convert from GraphQL info)
 */
export function loadMany<T extends BaseType<unknown, unknown, unknown>>(
  instances: T[],
  query?: QueryArgs
): Promise<InstanceResult<T>[]> {
  const exec = new Executor({});
  return exec.loadMany(instances, query);
}

/**
 * Universal resolver for any value type.
 * Handles: BaseType, Array<BaseType>, plain objects, scalars.
 *
 * @param value - Any value to resolve
 * @param query - QueryArgs specifying which fields to resolve
 * @returns Resolved value according to query
 */
export function resolve(value: unknown, query?: QueryArgs): Promise<unknown> {
  const exec = new Executor({});
  return exec.resolve(value, query);
}
