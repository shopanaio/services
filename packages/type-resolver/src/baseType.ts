import { Executor, load, loadMany } from "./executor.js";
import type { CacheStore } from "./decorators/Cache.js";
import type { QueryArgs, TypeClass, TypeContext, TypeResult } from "./types.js";

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
   * Optional executor with middleware. Set this in subclass to enable middleware.
   *
   * @example
   * ```typescript
   * class BaseResolver extends BaseType {
   *   static executor = createExecutor({ middleware: [authMiddleware] });
   * }
   * ```
   */
  static executor?: Executor<unknown>;

  /**
   * Static method to load and resolve a value through the executor.
   * Uses static `executor` if defined, otherwise creates a plain executor.
   *
   * @param value - The value to resolve
   * @param query - Optional QueryArgs (use parseGraphqlInfo to convert from GraphQL info)
   * @param ctx - Context object to pass to type instances
   */
  static async load<T extends TypeClass, TResult = TypeResult<T>>(
    this: T & { executor?: Executor<TypeContext<T>> },
    value: ConstructorParameters<T>[0],
    query: QueryArgs | undefined,
    ctx: TypeContext<T>
  ): Promise<TResult | null> {
    if (this.executor) {
      return this.executor.load<T, TResult>(this, value, query, ctx);
    }
    return load<T, TResult, TypeContext<T>>(this, value, query, ctx);
  }

  /**
   * Static method to load and resolve multiple values through the executor.
   * Uses static `executor` if defined, otherwise creates a plain executor.
   *
   * @param values - The values to resolve
   * @param query - Optional QueryArgs (use parseGraphqlInfo to convert from GraphQL info)
   * @param ctx - Context object to pass to type instances
   */
  static async loadMany<T extends TypeClass, TResult = TypeResult<T>>(
    this: T & { executor?: Executor<TypeContext<T>> },
    values: ConstructorParameters<T>[0][],
    query: QueryArgs | undefined,
    ctx: TypeContext<T>
  ): Promise<(TResult | null)[]> {
    if (this.executor) {
      return this.executor.loadMany<T, TResult>(this, values, query, ctx);
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
