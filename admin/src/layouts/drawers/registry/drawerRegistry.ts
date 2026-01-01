import type { IDrawerDefinition, DrawerRegistryMap, IDrawerPayload } from '../types';

/**
 * Global drawer registry
 * Stores all registered drawer definitions
 */
class DrawerRegistry {
  private registry: DrawerRegistryMap = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * Register a drawer definition
   * Call this from your domain module to register drawers
   *
   * @example
   * ```tsx
   * // In domains/inventory/products/drawers/index.ts
   * import { drawerRegistry } from '@/layouts/drawers';
   * import { ProductDrawer } from './ProductDrawer';
   *
   * drawerRegistry.register({
   *   type: 'product',
   *   component: ProductDrawer,
   *   width: 800,
   * });
   * ```
   */
  register<T extends IDrawerPayload>(definition: IDrawerDefinition<T>): void {
    if (this.registry.has(definition.type)) {
      console.warn(
        `[DrawerRegistry] Drawer type "${definition.type}" is already registered. Overwriting.`
      );
    }

    this.registry.set(definition.type, definition as IDrawerDefinition);
    this.notifyListeners();
  }

  /**
   * Register multiple drawer definitions at once
   *
   * @example
   * ```tsx
   * drawerRegistry.registerMany([
   *   { type: 'product', component: ProductDrawer },
   *   { type: 'category', component: CategoryDrawer },
   * ]);
   * ```
   */
  registerMany(definitions: IDrawerDefinition[]): void {
    definitions.forEach((def) => this.register(def));
  }

  /**
   * Unregister a drawer by type
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
   * Get a drawer definition by type
   */
  get(type: string): IDrawerDefinition | undefined {
    return this.registry.get(type);
  }

  /**
   * Check if a drawer type is registered
   */
  has(type: string): boolean {
    return this.registry.has(type);
  }

  /**
   * Get all registered drawer types
   */
  getTypes(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all registered definitions
   */
  getAll(): IDrawerDefinition[] {
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
   * Clear all registered drawers
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
 * Singleton drawer registry instance
 */
export const drawerRegistry = new DrawerRegistry();

/**
 * Helper function to register a drawer
 * Shorthand for drawerRegistry.register()
 */
export const registerDrawer = <T extends IDrawerPayload>(
  definition: IDrawerDefinition<T>
): void => {
  drawerRegistry.register(definition);
};

/**
 * Helper function to register multiple drawers
 */
export const registerDrawers = (definitions: IDrawerDefinition[]): void => {
  drawerRegistry.registerMany(definitions);
};
