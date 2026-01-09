import type { IEntityPickerConfig, IPickableEntity } from "../types";

/**
 * Registry for entity picker configurations
 */
const configRegistry = new Map<
  string,
  IEntityPickerConfig<IPickableEntity>
>();

/**
 * Register an entity picker configuration
 */
export function registerEntityPickerConfig<T extends IPickableEntity>(
  config: IEntityPickerConfig<T>
): void {
  if (configRegistry.has(config.entityType)) {
    console.warn(
      `[EntityPickerConfig] Entity type "${config.entityType}" is already registered. Overwriting.`
    );
  }
  configRegistry.set(
    config.entityType,
    config as unknown as IEntityPickerConfig<IPickableEntity>
  );
}

/**
 * Get entity picker configuration by type
 */
export function getEntityPickerConfig(
  entityType: string
): IEntityPickerConfig<IPickableEntity> | undefined {
  return configRegistry.get(entityType);
}

/**
 * Check if entity type is registered
 */
export function hasEntityPickerConfig(entityType: string): boolean {
  return configRegistry.has(entityType);
}

/**
 * Get all registered entity types
 */
export function getRegisteredEntityTypes(): string[] {
  return Array.from(configRegistry.keys());
}
