import { executor } from "./executor.js";
import type { TypeClass, FieldArgsTreeFor } from "./types.js";
import type { GraphQLResolveInfo } from "graphql";

/**
 * Abstract base class for type definitions.
 * Provides convenience methods for loading data and value properties.
 *
 * @template TId - The type of the identifier or raw input value
 * @template TData - The type of the loaded data entity (defaults to TId for backward compatibility)
 */
export abstract class BaseType<TId, TData = TId> {
  /**
   * Static method to load and resolve a value through the executor.
   * Allows calling `MyType.load(value, fields)` instead of `executor.resolve(MyType, value, fields)`.
   *
   * @param value - The raw value to resolve (typically an ID)
   * @param fieldArgs - Optional typed arguments tree to pass to resolvers
   * @returns The fully resolved object with all fields
   */
  static load<T extends TypeClass>(
    this: T,
    value: ConstructorParameters<T>[0],
    fieldArgs?: FieldArgsTreeFor<T> | GraphQLResolveInfo
  ): Promise<Record<string, unknown>> {
    return executor.resolve(this, value, fieldArgs);
  }

  /**
   * Static method to load and resolve multiple values through the executor.
   * Allows calling `MyType.loadMany(values, fields)` instead of `executor.resolveMany(MyType, values, fields)`.
   *
   * @param values - Array of raw values to resolve
   * @param fieldArgs - Optional typed arguments tree to pass to resolvers
   * @returns Array of fully resolved objects
   */
  static loadMany<T extends TypeClass>(
    this: T,
    values: ConstructorParameters<T>[0][],
    fieldArgs?: FieldArgsTreeFor<T> | GraphQLResolveInfo
  ): Promise<Record<string, unknown>[]> {
    return executor.resolveMany(this, values, fieldArgs);
  }

  private _dataPromise: Promise<TData> | null = null;

  constructor(public value: TId) {}

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
