import type { GraphQLResolveInfo } from "graphql";
import { load, loadMany } from "./executor.js";
import type { FieldArgsTreeFor, TypeClass, TypeResult } from "./types.js";

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
   * Static method to load and resolve a value through the executor.
   *
   * @param value - The value to resolve
   * @param fieldArgs - Optional field arguments or GraphQL resolve info
   * @param ctx - Context object to pass to type instances
   */
  static load<T extends TypeClass, TResult = TypeResult<T>, TCtx = unknown>(
    this: T,
    value: ConstructorParameters<T>[0],
    fieldArgs: FieldArgsTreeFor<T> | GraphQLResolveInfo | undefined,
    ctx: TCtx
  ): Promise<TResult> {
    return load<T, TResult, TCtx>(this, value, fieldArgs, ctx);
  }

  /**
   * Static method to load and resolve multiple values through the executor.
   *
   * @param values - The values to resolve
   * @param fieldArgs - Optional field arguments or GraphQL resolve info
   * @param ctx - Context object to pass to type instances
   */
  static loadMany<T extends TypeClass, TResult = TypeResult<T>, TCtx = unknown>(
    this: T,
    values: ConstructorParameters<T>[0][],
    fieldArgs: FieldArgsTreeFor<T> | GraphQLResolveInfo | undefined,
    ctx: TCtx
  ): Promise<TResult[]> {
    return loadMany<T, TResult, TCtx>(this, values, fieldArgs, ctx);
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
  protected async get<K extends keyof TData>(key: K): Promise<TData[K]>;
  protected async get(key?: keyof TData): Promise<TData | TData[keyof TData]> {
    const data = await this.data;
    if (key === undefined) {
      return data;
    }
    return data[key];
  }
}
