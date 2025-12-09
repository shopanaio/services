import { getContext, type BaseContext } from "./context.js";

/**
 * Abstract base class for type definitions.
 * Provides convenience methods for accessing context, loading data, and value properties.
 *
 * @template TId - The type of the identifier or raw input value
 * @template TData - The type of the loaded data entity (defaults to TId for backward compatibility)
 */
export abstract class BaseType<TId, TData = TId> {
  private _dataPromise: Promise<TData> | null = null;

  constructor(public value: TId) {}

  /**
   * Gets the current context.
   * Shorthand for getContext().
   */
  protected ctx<C extends BaseContext = BaseContext>(): C {
    return getContext<C>();
  }

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
