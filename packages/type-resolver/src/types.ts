/**
 * Type class constructor interface.
 * @template TValue - The type of the value passed to the constructor
 * @template TContext - The type of the context passed to the constructor
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TypeClass<TValue = any, TContext = any> {
  new (value?: TValue, ctx?: TContext): object;
}

/**
 * Extracts the context type from a TypeClass.
 */
export type TypeContext<T extends TypeClass> = T extends TypeClass<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  infer TCtx
>
  ? TCtx
  : unknown;

/**
 * Instance of a TypeClass with value and resolver methods.
 */
export interface TypeInstance {
  value: unknown;
}

/**
 * Executor options for customizing behavior.
 * @template TContext - The type of the context to pass to type instances
 */
export interface ExecutorOptions<TContext = unknown> {
  /**
   * Error handling strategy:
   * - 'throw': Re-throw errors (default)
   * - 'null': Return null for failed fields
   * - 'partial': Return { __error: message } for failed fields
   */
  onError?: "throw" | "null" | "partial";
  /**
   * Context object to pass to all type instances.
   * Available as `this.ctx` in BaseType subclasses.
   */
  ctx?: TContext;
  /**
   * Middleware stack for extending executor behavior.
   * Middleware are executed in registration order.
   *
   * @example
   * ```typescript
   * const executor = createExecutor({
   *   ctx,
   *   middleware: [authMiddleware, loggingMiddleware],
   * });
   * ```
   */
  middleware?: MiddlewareStack<TContext>;
}

/**
 * Helper type to extract resolver method return type.
 * Methods can optionally accept a single argument object.
 */
export type ResolverMethod<T, A = undefined> = (args?: A) => T | Promise<T>;

type Instance<T extends TypeClass> = InstanceType<T>;

/**
 * Extracts all resolver method keys from a TypeClass instance.
 * Excludes constructor and non-function properties.
 */
export type ResolverKeys<T extends TypeClass> = {
  [K in keyof Instance<T>]: Instance<T>[K] extends (...args: never[]) => unknown
    ? K extends "constructor"
      ? never
      : K
    : never;
}[keyof Instance<T>];


/**
 * Extracts the argument type for a resolver method.
 * Returns `undefined` for methods without parameters.
 */
export type ArgsForField<
  T extends TypeClass,
  K extends ResolverKeys<T>
> = Instance<T>[K] extends (arg: infer P, ...rest: never[]) => unknown
  ? P
  : undefined;

/**
 * Query arguments - native format for Executor.
 * Works like GraphQL: if a field is not specified - it won't be resolved.
 *
 * @example
 * ```typescript
 * const query: QueryArgs = {
 *   fields: ["id", "title", "handle"],
 *   populate: {
 *     variants: {
 *       args: { where: { isPublished: { _eq: true } }, first: 10 },
 *       fields: ["id", "sku", "price"],
 *       populate: {
 *         options: {
 *           fields: ["id", "name"]
 *         }
 *       }
 *     }
 *   }
 * };
 * ```
 */
export type QueryArgs<TArgs = unknown> = {
  /**
   * Scalar fields to resolve (without children).
   * @example fields: ["id", "title", "handle"]
   */
  fields?: string[];

  /**
   * Relation fields with nested structure.
   * IMPORTANT: you need to specify children explicitly.
   *
   * @example
   * populate: {
   *   variants: {
   *     args: { where: { isPublished: { _eq: true } }, first: 10 },
   *     fields: ["id", "sku", "price"],
   *     populate: {
   *       options: {
   *         fields: ["id", "name"]
   *       }
   *     }
   *   }
   * }
   */
  populate?: {
    [fieldName: string]: QueryArgs;
  };

  /**
   * Generic args - passed to resolver method as-is.
   */
  args?: TArgs;

  /**
   * Alias support - specifies the real method name.
   * @example { "publishedVariants": { fieldName: "variants", args: {...} } }
   */
  fieldName?: string;
};

/**
 * Internal/system method names from BaseType that should be excluded from TypeResult.
 */
type BaseTypeInternalMethods = "$preload" | "$get" | "$data";

/**
 * Infers the result type from a TypeClass.
 * Maps resolver methods to their return types.
 * Excludes constructor and internal BaseType methods ($preload, $get, $data).
 */
export type TypeResult<T extends TypeClass> = {
  [K in keyof InstanceType<T> as InstanceType<T>[K] extends (
    ...args: unknown[]
  ) => unknown
    ? K extends "constructor" | BaseTypeInternalMethods
      ? never
      : K
    : never]: InstanceType<T>[K] extends ResolverMethod<infer R> ? R : never;
};

/**
 * Utility type to extract the value type from a TypeClass.
 */
export type TypeValue<T extends TypeClass> = T extends TypeClass<infer V>
  ? V
  : never;

// ============================================================================
// Middleware Types
// ============================================================================

/**
 * Base context passed to all middleware hooks.
 */
export interface MiddlewareContext<TContext = unknown> {
  /** The TypeClass being loaded */
  readonly Type: TypeClass;
  /** The value passed to load() */
  readonly value: unknown;
  /** Query arguments for field selection */
  readonly query?: QueryArgs;
  /** User-provided context */
  readonly ctx: TContext;
}

/**
 * Context for afterCreate hook - instance is available.
 */
export interface AfterCreateContext<TContext = unknown>
  extends MiddlewareContext<TContext> {
  /** The created instance (mutable) */
  readonly instance: object;
}

/**
 * Context for afterLoad hook - result is available.
 */
export interface AfterLoadContext<TContext = unknown>
  extends AfterCreateContext<TContext> {
  /** The resolved result object (mutable) */
  result: Record<string, unknown>;
}

/**
 * Result from middleware hook execution.
 * - void/undefined: continue normal execution
 * - null: short-circuit and return null
 * - Error thrown: propagate error
 */
export type MiddlewareResult = void | null;

/**
 * Middleware interface for extending Executor behavior.
 *
 * Middleware hooks are called in registration order.
 * Any hook can short-circuit by returning null or throwing an error.
 *
 * @template TContext - The context type passed to type instances
 *
 * @example
 * ```typescript
 * const loggingMiddleware: Middleware = {
 *   name: "logging",
 *   afterCreate: async ({ Type, instance }) => {
 *     console.log(`Created ${Type.name}`);
 *   },
 *   afterLoad: async ({ Type, result }) => {
 *     console.log(`Loaded ${Type.name}:`, result);
 *   },
 * };
 * ```
 */
export interface Middleware<TContext = unknown> {
  /**
   * Optional name for debugging and identification.
   */
  readonly name?: string;

  /**
   * Called after instance creation, before $preload() and field resolution.
   *
   * Use cases:
   * - Authorization checks (access instance.authorize())
   * - Instance validation
   * - Logging/metrics
   *
   * @returns void to continue, null to short-circuit with null result
   * @throws Error to abort with error
   */
  afterCreate?(ctx: AfterCreateContext<TContext>): Promise<MiddlewareResult>;

  /**
   * Called after all fields are resolved.
   *
   * Use cases:
   * - Result transformation
   * - Field filtering/masking
   * - Logging/metrics
   *
   * Note: Mutate ctx.result directly to modify the output.
   *
   * @returns void to continue, null to return null instead of result
   * @throws Error to abort with error
   */
  afterLoad?(ctx: AfterLoadContext<TContext>): Promise<MiddlewareResult>;
}

/**
 * Array of middleware to be executed in order.
 */
export type MiddlewareStack<TContext = unknown> = Middleware<TContext>[];
