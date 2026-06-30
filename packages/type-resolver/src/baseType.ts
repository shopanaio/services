import type { Executor } from "./executor.js";
import type { CacheStore } from "./decorators/Cache.js";
import type { QueryArgs, TypeClass, TypeContext, TypeResult } from "./types.js";

/**
 * Abstract base class for type definitions.
 * Provides convenience methods for loading data and props.
 *
 * @template TProps - The type of the input props passed to the constructor
 * @template TData - The type of the loaded data entity (defaults to TProps)
 * @template TContext - The type of the context object (defaults to unknown)
 */
export abstract class BaseType<TProps, TData = TProps, TContext = unknown> {
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
   * @param props - The props to resolve
   * @param query - Optional QueryArgs (use parseGraphqlInfo to convert from GraphQL info)
   * @param ctx - Context object to pass to type instances
   */
  static async load<T extends TypeClass, TResult = TypeResult<T>>(
    this: T & { executor?: Executor<TypeContext<T>> },
    value: ConstructorParameters<T>[0],
    query: QueryArgs | undefined,
    ctx: TypeContext<T>
  ): Promise<TResult | null> {
    const instance = new this(value, ctx) as unknown as BaseType<
      unknown,
      unknown,
      TypeContext<T>
    >;
    if (this.executor) {
      return this.executor.load(instance, query) as Promise<TResult | null>;
    }
    const { load } = await import("./executor.js");
    return load(instance, query) as Promise<TResult | null>;
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
    const instances = values.map(
      (value) =>
        new this(value, ctx) as unknown as BaseType<
          unknown,
          unknown,
          TypeContext<T>
        >
    );
    if (this.executor) {
      return this.executor.loadMany(instances, query) as Promise<
        (TResult | null)[]
      >;
    }
    const { loadMany } = await import("./executor.js");
    return loadMany(instances, query) as Promise<(TResult | null)[]>;
  }

  private _dataPromise: Promise<TData> | null = null;
  private _ctx?: TContext;
  private _props: TProps;

  constructor(props: TProps, ctx?: TContext) {
    this._props = props;
    this._ctx = ctx;
  }

  get $ctx(): TContext {
    return this._ctx as TContext;
  }

  get $props(): TProps {
    return this._props;
  }

  /**
   * Preloads entity data. Override this method to load data via loaders.
   * Called lazily on first access to `this.$data`.
   *
   * @returns The loaded data entity
   */
  protected $preload(): TData | Promise<TData> {
    throw new Error("not implemented");
  }

  /**
   * Gets the loaded data lazily.
   * First access triggers $preload(), subsequent accesses return cached promise.
   * Use with await: `const d = await this.$data;`
   */
  protected get $data(): Promise<TData> {
    if (!this._dataPromise) {
      this._dataPromise = Promise.resolve(this.$preload());
    }
    return this._dataPromise;
  }

  /**
   * Convenience accessor for loaded data properties.
   * Uses the lazily-loaded `$data` under the hood.
   *
   * @param key - The property key to access from loaded data
   * @returns The property value from loaded data
   */
  protected async $get<K extends keyof TData>(key: K): Promise<TData[K]> {
    const data = await this.$data;
    return data[key];
  }

  /**
   * Returns cache instance for @Cache decorator.
   * Override this method in subclass to provide cache implementation.
   */
  protected getCache(): CacheStore {
    throw new Error("getCache() must be implemented to use @Cache decorator");
  }
}
