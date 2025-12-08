/**
 * Type class constructor interface.
 * A TypeClass is a class that:
 * - Takes a value in its constructor
 * - Has methods that act as resolvers
 * - Optionally has a static `fields` property mapping to child types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TypeClass<T = any> {
  new (value: T): object;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fields?: Record<string, () => TypeClass<any>>;
}

/**
 * Instance of a TypeClass with value and resolver methods.
 */
export interface TypeInstance {
  value: unknown;
}

/**
 * Executor options for customizing behavior.
 */
export interface ExecutorOptions {
  /**
   * Error handling strategy:
   * - 'throw': Re-throw errors (default)
   * - 'null': Return null for failed fields
   * - 'partial': Return { __error: message } for failed fields
   */
  onError?: "throw" | "null" | "partial";
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
  K extends ResolverKeys<T>,
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
  K extends ResolverKeys<T>,
> = Instance<T>[K] extends (arg: infer P, ...rest: never[]) => unknown
  ? P
  : undefined;

/**
 * Recursively builds a typed arguments tree for a TypeClass.
 * Each field can have:
 * - `args`: the arguments to pass to the resolver method
 * - `children`: nested arguments for child types (via static fields)
 */
export type FieldArgsTreeFor<T extends TypeClass> = {
  [K in ResolverKeys<T>]?: ArgsForField<T, K> extends undefined
    ? ChildTypeFor<T, K> extends TypeClass
      ? { children?: FieldArgsTreeFor<ChildTypeFor<T, K>> }
      : never
    : {
        args?: ArgsForField<T, K>;
        children?: ChildTypeFor<T, K> extends TypeClass
          ? FieldArgsTreeFor<ChildTypeFor<T, K>>
          : never;
      };
};

/**
 * Infers the result type from a TypeClass.
 * Maps resolver methods to their return types, handling nested types.
 */
export type TypeResult<T extends TypeClass> = {
  [K in keyof InstanceType<T> as InstanceType<T>[K] extends (...args: unknown[]) => unknown
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
export type TypeValue<T extends TypeClass> = T extends TypeClass<infer V> ? V : never;
