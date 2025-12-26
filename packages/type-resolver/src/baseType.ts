import { load, loadMany } from "./executor.js";
import type { CacheStore } from "./decorators/Cache.js";
import type {
  QueryArgs,
  TypeClass,
  TypeContext,
  TypeResult,
} from "./types.js";

/**
 * Authorization policy for type resolvers.
 * Checked once on load/loadMany before resolving fields.
 */
export interface TypePolicy {
  resource: string;
  action: string;
  /** Behavior when authorization fails: 'throw' (default) or 'null' */
  onDeny?: "throw" | "null";
  /** Domain for authorization (e.g., "store:123"). Can be a string or a function that receives the value. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  domain?: string | ((resolver: any) => string);
}

/**
 * Error thrown when authorization fails.
 */
export class TypeAuthorizationError extends Error {
  constructor(
    public readonly resource: string,
    public readonly action: string
  ) {
    super(`Access denied: ${resource}:${action}`);
    this.name = "TypeAuthorizationError";
  }
}

/**
 * Abstract base class for type definitions.
 * Provides convenience methods for loading data and value properties.
 *
 * @template TValue - The type of the input value passed to the constructor
 * @template TData - The type of the loaded data entity (defaults to TValue)
 * @template TContext - The type of the context object (defaults to unknown)
 */
export abstract class BaseType<TValue, TData = TValue, TContext = unknown> {
  /**
   * Authorization policy. Override in subclass to enable auth checks on load/loadMany.
   *
   * @example
   * ```typescript
   * class StoreResolver extends BaseResolver<string, Store | null> {
   *   static policy = { resource: "store", action: "read", onDeny: "null" };
   * }
   * ```
   */
  static policy?: TypePolicy;

  /**
   * Override this method in subclass to implement authorization logic.
   * Called by checkPolicy when policy is defined.
   *
   * @param ctx - Context object
   * @param policy - Policy to check
   * @param value - The value being loaded (for domain resolution)
   * @returns true if authorized, false otherwise
   */
  protected static authorize(
    _ctx: unknown,
    _policy: TypePolicy,
    _value?: unknown
  ): Promise<boolean> {
    // Default: no authorization check
    return Promise.resolve(true);
  }

  /**
   * Check authorization policy. Override authorize() to customize.
   */
  static async checkPolicy(
    ctx: unknown,
    policy: TypePolicy,
    value?: unknown
  ): Promise<boolean> {
    return this.authorize(ctx, policy, value);
  }

  /**
   * Static method to load and resolve a value through the executor.
   * Checks policy before loading if defined.
   *
   * @param value - The value to resolve
   * @param query - Optional QueryArgs (use parseGraphqlInfo to convert from GraphQL info)
   * @param ctx - Context object to pass to type instances
   */
  static async load<T extends TypeClass, TResult = TypeResult<T>>(
    this: T & { policy?: TypePolicy; checkPolicy?: typeof BaseType.checkPolicy },
    value: ConstructorParameters<T>[0],
    query: QueryArgs | undefined,
    ctx: TypeContext<T>
  ): Promise<TResult | null> {
    if (this.policy && this.checkPolicy) {
      const allowed = await this.checkPolicy(ctx, this.policy, value);
      if (!allowed) {
        if (this.policy.onDeny === "null") {
          return null;
        }
        throw new TypeAuthorizationError(this.policy.resource, this.policy.action);
      }
    }
    return load<T, TResult, TypeContext<T>>(this, value, query, ctx);
  }

  /**
   * Static method to load and resolve multiple values through the executor.
   * Checks policy before loading if defined.
   *
   * @param values - The values to resolve
   * @param query - Optional QueryArgs (use parseGraphqlInfo to convert from GraphQL info)
   * @param ctx - Context object to pass to type instances
   */
  static async loadMany<T extends TypeClass, TResult = TypeResult<T>>(
    this: T & { policy?: TypePolicy; checkPolicy?: typeof BaseType.checkPolicy },
    values: ConstructorParameters<T>[0][],
    query: QueryArgs | undefined,
    ctx: TypeContext<T>
  ): Promise<TResult[] | null> {
    if (this.policy && this.checkPolicy) {
      const allowed = await this.checkPolicy(ctx, this.policy);
      if (!allowed) {
        if (this.policy.onDeny === "null") {
          return null;
        }
        throw new TypeAuthorizationError(this.policy.resource, this.policy.action);
      }
    }
    return loadMany<T, TResult, TypeContext<T>>(this, values, query, ctx);
  }

  private _dataPromise: Promise<TData> | null = null;

  constructor(public value: TValue, protected readonly ctx: TContext) {}

  /**
   * Loads entity data. Override this method to load data via loaders.
   * Called lazily on first access to `this.data`.
   *
   * @returns The loaded data entity
   */
  protected loadData(): TData | Promise<TData> {
    // Default: use value as data (for backward compatibility when value is already the data object)
    return this.value as unknown as TData;
  }

  /**
   * Gets the loaded data lazily.
   * First access triggers loadData(), subsequent accesses return cached promise.
   * Use with await: `const d = await this.data;`
   */
  protected get data(): Promise<TData> {
    if (!this._dataPromise) {
      this._dataPromise = Promise.resolve(this.loadData());
    }
    return this._dataPromise;
  }

  /**
   * Convenience accessor for loaded data properties.
   * Uses the lazily-loaded `data` under the hood.
   *
   * @returns The whole loaded entity when called without arguments, or a single property when key is provided.
   */
  protected async get(): Promise<TData>;
  protected async get<K extends keyof NonNullable<TData>>(
    key: K
  ): Promise<NonNullable<TData>[K] | undefined>;
  protected async get(
    key?: keyof NonNullable<TData>
  ): Promise<TData | NonNullable<TData>[keyof NonNullable<TData>] | undefined> {
    const data = await this.data;
    if (key === undefined) {
      return data;
    }
    if (data == null) {
      return undefined;
    }
    return (data as NonNullable<TData>)[key];
  }

  /**
   * Returns cache instance for @Cache decorator.
   * Override this method in subclass to provide cache implementation.
   */
  protected getCache(): CacheStore {
    throw new Error("getCache() must be implemented to use @Cache decorator");
  }
}
