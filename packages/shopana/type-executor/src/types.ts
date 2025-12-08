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
 */
export type ResolverMethod<T> = () => T | Promise<T>;

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
