/**
 * Type class constructor interface.
 * @template TValue - The type of the value passed to the constructor
 * @template TContext - The type of the context passed to the constructor
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TypeClass<TValue = any, TContext = any> {
  new (value: TValue, ctx: TContext): object;
  fields?: Record<string, Function>;
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
 * Resolves the child TypeClass for a given resolver key via static fields.
 * Returns `never` if no child type is defined.
 */
export type ChildTypeFor<
  T extends TypeClass,
  K extends ResolverKeys<T>
> = K extends keyof NonNullable<T["fields"]>
  ? NonNullable<T["fields"]>[K] extends () => infer CT
    ? CT extends TypeClass
      ? CT
      : never
    : never
  : never;

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
type BaseTypeInternalMethods = "loadData" | "get" | "data";

/**
 * Infers the result type from a TypeClass.
 * Maps resolver methods to their return types, handling nested types.
 * Excludes constructor and internal BaseType methods (loadData, get, data).
 */
export type TypeResult<T extends TypeClass> = {
  [K in keyof InstanceType<T> as InstanceType<T>[K] extends (
    ...args: unknown[]
  ) => unknown
    ? K extends "constructor" | BaseTypeInternalMethods
      ? never
      : K
    : never]: InstanceType<T>[K] extends ResolverMethod<infer R>
    ? K extends keyof NonNullable<T["fields"]>
      ? NonNullable<T["fields"]>[K] extends () => infer ChildType
        ? ChildType extends TypeClass
          ? R extends unknown[]
            ? TypeResult<ChildType>[]
            : TypeResult<ChildType>
          : R
        : R
      : R
    : never;
};

/**
 * Utility type to extract the value type from a TypeClass.
 */
export type TypeValue<T extends TypeClass> = T extends TypeClass<infer V>
  ? V
  : never;
