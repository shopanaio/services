import type { IStackDefinition, StackRegistryMap, IStackPayload } from '../types';

/**
 * Global stack registry
 * Stores all registered stack item definitions
 */
class StackRegistry {
  private registry: StackRegistryMap = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * Register a stack item definition
   * Call this from your domain module to register stack items
   *
   * @example
   * ```tsx
   * // In domains/inventory/products/modals/index.ts
   * import { stackRegistry } from '@/layouts/modals';
   * import { ProductModal } from './ProductModal';
   *
   * stackRegistry.register({
   *   type: 'product',
   *   component: ProductModal,
   * });
   * ```
   */
  register<T extends IStackPayload>(definition: IStackDefinition<T>): void {
    if (this.registry.has(definition.type)) {
      console.warn(
        `[StackRegistry] Stack item type "${definition.type}" is already registered. Overwriting.`
      );
    }

    this.registry.set(definition.type, definition as IStackDefinition);
    this.notifyListeners();
  }

  /**
   * Register multiple stack item definitions at once
   *
   * @example
   * ```tsx
   * stackRegistry.registerMany([
   *   { type: 'product', component: ProductModal },
   *   { type: 'category', component: CategoryModal },
   * ]);
   * ```
   */
  registerMany(definitions: IStackDefinition[]): void {
    definitions.forEach((def) => this.register(def));
  }

  /**
   * Unregister a stack item by type
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
   * Get a stack item definition by type
   */
  get(type: string): IStackDefinition | undefined {
    return this.registry.get(type);
  }

  /**
   * Check if a stack item type is registered
   */
  has(type: string): boolean {
    return this.registry.has(type);
  }

  /**
   * Get all registered stack item types
   */
  getTypes(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all registered definitions
   */
  getAll(): IStackDefinition[] {
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
   * Clear all registered stack items
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
 * Singleton stack registry instance
 */
export const stackRegistry = new StackRegistry();

/**
 * Helper function to register a stack item
 * Shorthand for stackRegistry.register()
 */
export const registerStackItem = <T extends IStackPayload>(
  definition: IStackDefinition<T>
): void => {
  stackRegistry.register(definition);
};

/**
 * Helper function to register multiple stack items
 */
export const registerStackItems = (definitions: IStackDefinition[]): void => {
  stackRegistry.registerMany(definitions);
};

// ============================================================================
// Legacy aliases (deprecated, for backwards compatibility)
// ============================================================================

/** @deprecated Use stackRegistry instead */
export const modalRegistry = stackRegistry;

/** @deprecated Use registerStackItem instead */
export const registerModal = registerStackItem;

/** @deprecated Use registerStackItems instead */
export const registerModals = registerStackItems;
