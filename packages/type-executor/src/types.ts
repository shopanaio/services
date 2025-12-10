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
 * A single field node in the args tree.
 * - `fieldName`: the actual method name to call (for aliases, this differs from the key)
 * - `args`: the arguments to pass to the resolver method
 * - `children`: nested arguments for child types (via static fields)
 */
export interface FieldArgsNode<TArgs = unknown, TChildren = unknown> {
  /** The actual method name to call. If omitted, the key is used as the method name. */
  fieldName?: string;
  /** Arguments to pass to the resolver method */
  args?: TArgs;
  /** Nested field arguments for child types */
  children?: TChildren;
}

/**
 * Recursively builds a typed arguments tree for a TypeClass.
 * Keys can be field names or aliases.
 * Each field can have:
 * - `fieldName`: the actual method to call (when using aliases)
 * - `args`: the arguments to pass to the resolver method
 * - `children`: nested arguments for child types (via static fields)
 */
export type FieldArgsTreeFor<T extends TypeClass> = {
  [K in ResolverKeys<T>]?: ArgsForField<T, K> extends undefined
    ? ChildTypeFor<T, K> extends TypeClass
      ? FieldArgsNode<undefined, FieldArgsTreeFor<ChildTypeFor<T, K>>>
      : FieldArgsNode<undefined, never>
    : ChildTypeFor<T, K> extends TypeClass
    ? FieldArgsNode<ArgsForField<T, K>, FieldArgsTreeFor<ChildTypeFor<T, K>>>
    : FieldArgsNode<ArgsForField<T, K>, never>;
} & {
  /** Support for aliased fields - any string key with fieldName pointing to actual method */
  [alias: string]: FieldArgsNode | undefined;
};

/**
 * Infers the result type from a TypeClass.
 * Maps resolver methods to their return types, handling nested types.
 */
export type TypeResult<T extends TypeClass> = {
  [K in keyof InstanceType<T> as InstanceType<T>[K] extends (
    ...args: unknown[]
  ) => unknown
    ? K extends "constructor"
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
