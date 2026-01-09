import type { IModalStackDefinition, ModalStackRegistryMap, IModalStackPayload } from '../types';

/**
 * Global modal stack registry
 * Stores all registered modal stack item definitions
 */
class ModalStackRegistry {
  private registry: ModalStackRegistryMap = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * Register a modal stack item definition
   * Call this from your domain module to register items
   *
   * @example
   * ```tsx
   * // In domains/inventory/products/modals/index.ts
   * import { modalStackRegistry } from '@/layouts/modals';
   * import { ProductModal } from './product-modal';
   *
   * modalStackRegistry.register({
   *   type: 'product',
   *   component: ProductModal,
   * });
   * ```
   */
  register<T extends IModalStackPayload>(definition: IModalStackDefinition<T>): void {
    if (this.registry.has(definition.type)) {
      console.warn(
        `[ModalStackRegistry] Item type "${definition.type}" is already registered. Overwriting.`
      );
    }

    this.registry.set(definition.type, definition as IModalStackDefinition);
    this.notifyListeners();
  }

  /**
   * Register multiple modal stack item definitions at once
   *
   * @example
   * ```tsx
   * modalStackRegistry.registerMany([
   *   { type: 'product', component: ProductModal },
   *   { type: 'category', component: CategoryModal },
   * ]);
   * ```
   */
  registerMany(definitions: IModalStackDefinition[]): void {
    definitions.forEach((def) => this.register(def));
  }

  /**
   * Unregister a modal stack item by type
   * Useful for cleanup in tests or dynamic module unloading
   */
  unregister(type: string): boolean {
    const result = this.registry.delete(type);
    if (result) {
      this.notifyListeners();
    }
    return result;
  }

  /**
   * Get a modal stack item definition by type
   */
  get(type: string): IModalStackDefinition | undefined {
    return this.registry.get(type);
  }

  /**
   * Check if a modal stack item type is registered
   */
  has(type: string): boolean {
    return this.registry.has(type);
  }

  /**
   * Get all registered modal stack item types
   */
  getTypes(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all registered definitions
   */
  getAll(): IModalStackDefinition[] {
    return Array.from(this.registry.values());
  }

  /**
   * Subscribe to registry changes
   * Returns unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clear all registered modal stack items
   * Useful for testing
   */
  clear(): void {
    this.registry.clear();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

/**
 * Singleton modal stack registry instance
 */
export const modalStackRegistry = new ModalStackRegistry();

/**
 * Helper function to register a modal stack item
 * Shorthand for modalStackRegistry.register()
 */
export const registerModalStackItem = <T extends IModalStackPayload>(
  definition: IModalStackDefinition<T>
): void => {
  modalStackRegistry.register(definition);
};

/**
 * Helper function to register multiple modal stack items
 */
export const registerModalStackItems = (definitions: IModalStackDefinition[]): void => {
  modalStackRegistry.registerMany(definitions);
};
