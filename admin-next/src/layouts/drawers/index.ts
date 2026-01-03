// ============================================================================
// Components
// ============================================================================
export { Drawers } from './components/Drawers';
export { DrawerWrapper, EntityDrawer } from './components/Drawer';
export { DrawerProvider, EntityDrawersProvider } from './components/Provider';

// ============================================================================
// Registry
// ============================================================================
export {
  drawerRegistry,
  registerDrawer,
  registerDrawers,
} from './registry/drawerRegistry';

// ============================================================================
// Store
// ============================================================================
export { useDrawersStore } from './store/drawers';

// ============================================================================
// Hooks
// ============================================================================
export { useDrawerContext } from './hooks/useDrawerContext';
export { useDrawer, useDrawerActions, createDrawerHook } from './hooks/useDrawer';

// Legacy hooks (deprecated)
export { useEntityDrawer } from './hooks/useEntityDrawer';
export { useEntityDrawerType } from './hooks/useEntityDrawerType';

// ============================================================================
// Types
// ============================================================================
export type {
  // New types
  IDrawerPayload,
  IDrawerItem,
  IDrawerContext,
  IDrawerDefinition,
  IOpenDrawerOptions,
  DrawerComponent,
  DrawerRegistryMap,
  DrawerPayloads,
  GetDrawerPayload,
  // Legacy types (deprecated)
  IEntityDrawerItem,
} from './types';

// Legacy enum (deprecated)
export { DrawerTypes } from './types';
