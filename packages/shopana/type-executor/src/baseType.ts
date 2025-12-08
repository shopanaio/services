import { getContext, type BaseContext } from "./context.js";

/**
 * Abstract base class for type definitions.
 * Provides convenience methods for accessing context and value properties.
 *
 * @template T - The type of the raw value
 */
export abstract class BaseType<T> {
  constructor(public value: T) {}

  /**
   * Gets the current context.
   * Shorthand for getContext().
   */
  protected ctx<C extends BaseContext = BaseContext>(): C {
    return getContext<C>();
  }

  /**
   * Gets a property from the value.
   * Provides type-safe access to value properties.
   *
   * @param key - The property key to access
   * @returns The value of the property
   */
  protected get<K extends keyof T>(key: K): T[K] {
    return this.value[key];
  }
}
