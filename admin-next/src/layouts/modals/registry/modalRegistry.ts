import type { IModalDefinition, ModalRegistryMap, IModalPayload } from '../types';

/**
 * Global modal registry
 * Stores all registered modal definitions
 */
class ModalRegistry {
  private registry: ModalRegistryMap = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * Register a modal definition
   * Call this from your domain module to register modals
   *
   * @example
   * ```tsx
   * // In domains/inventory/products/modals/index.ts
   * import { modalRegistry } from '@/layouts/modals';
   * import { ProductModal } from './ProductModal';
   *
   * modalRegistry.register({
   *   type: 'product',
   *   component: ProductModal,
   * });
   * ```
   */
  register<T extends IModalPayload>(definition: IModalDefinition<T>): void {
    if (this.registry.has(definition.type)) {
      console.warn(
        `[ModalRegistry] Modal type "${definition.type}" is already registered. Overwriting.`
      );
    }

    this.registry.set(definition.type, definition as IModalDefinition);
    this.notifyListeners();
  }

  /**
   * Register multiple modal definitions at once
   *
   * @example
   * ```tsx
   * modalRegistry.registerMany([
   *   { type: 'product', component: ProductModal },
   *   { type: 'category', component: CategoryModal },
   * ]);
   * ```
   */
  registerMany(definitions: IModalDefinition[]): void {
    definitions.forEach((def) => this.register(def));
  }

  /**
   * Unregister a modal by type
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
   * Get a modal definition by type
   */
  get(type: string): IModalDefinition | undefined {
    return this.registry.get(type);
  }

  /**
   * Check if a modal type is registered
   */
  has(type: string): boolean {
    return this.registry.has(type);
  }

  /**
   * Get all registered modal types
   */
  getTypes(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all registered definitions
   */
  getAll(): IModalDefinition[] {
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
   * Clear all registered modals
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
 * Singleton modal registry instance
 */
export const modalRegistry = new ModalRegistry();

/**
 * Helper function to register a modal
 * Shorthand for modalRegistry.register()
 */
export const registerModal = <T extends IModalPayload>(
  definition: IModalDefinition<T>
): void => {
  modalRegistry.register(definition);
};

/**
 * Helper function to register multiple modals
 */
export const registerModals = (definitions: IModalDefinition[]): void => {
  modalRegistry.registerMany(definitions);
};
