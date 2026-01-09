import { RelationControlComponent } from '../../core/types';

/**
 * Registry for relation control components
 * Register your entity-specific controls here
 *
 * @example
 * // In your app initialization or module
 * import { relationControlRegistry } from '@/layouts/filters';
 * import { CategorySelect } from '@/modules/categories/components/CategorySelect';
 *
 * relationControlRegistry.register('Category', CategorySelect);
 */
class RelationControlRegistry {
  private controls = new Map<string, RelationControlComponent>();

  /**
   * Register a control component for an entity type
   */
  register(entity: string, component: RelationControlComponent): void {
    this.controls.set(entity, component);
  }

  /**
   * Unregister a control component
   */
  unregister(entity: string): void {
    this.controls.delete(entity);
  }

  /**
   * Get a control component for an entity type
   */
  get(entity: string): RelationControlComponent | undefined {
    return this.controls.get(entity);
  }

  /**
   * Check if a control is registered for an entity type
   */
  has(entity: string): boolean {
    return this.controls.has(entity);
  }

  /**
   * Get all registered entity types
   */
  getRegisteredEntities(): string[] {
    return Array.from(this.controls.keys());
  }

  /**
   * Clear all registered controls
   */
  clear(): void {
    this.controls.clear();
  }
}

/**
 * Global registry instance for relation controls
 */
export const relationControlRegistry = new RelationControlRegistry();
