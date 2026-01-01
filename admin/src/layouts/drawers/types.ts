import { ComponentType, LazyExoticComponent } from 'react';

/**
 * Base payload interface for all drawers
 * Each drawer type extends this with its own payload shape
 */
export interface IDrawerPayload {
  entityId?: string | number;
  mode?: 'view' | 'edit' | 'create';
  [key: string]: unknown;
}

/**
 * Drawer item stored in the state
 */
export interface IDrawerItem<T extends IDrawerPayload = IDrawerPayload> {
  uuid: string;
  type: string;
  payload: T;
  isDirty?: boolean;
}

/**
 * Context value provided to drawer components
 */
export interface IDrawerContext<T extends IDrawerPayload = IDrawerPayload> {
  uuid: string;
  type: string;
  payload: T;
  isDirty: boolean;
  close: () => void;
  forceClose: () => void;
  setDirty: (dirty: boolean) => void;
  updatePayload: (payload: Partial<T>) => void;
}

/**
 * Drawer component type - can be regular or lazy loaded
 */
export type DrawerComponent<T extends IDrawerPayload = IDrawerPayload> =
  | ComponentType<{}>
  | LazyExoticComponent<ComponentType<{}>>;

/**
 * Drawer definition for registration
 */
export interface IDrawerDefinition<T extends IDrawerPayload = IDrawerPayload> {
  type: string;
  component: DrawerComponent<T>;
  /** Default width, can be number (px) or string (e.g., 'calc(100vw - 100px)') */
  width?: number | string;
  /** Whether to show close confirmation when dirty */
  confirmOnDirtyClose?: boolean;
  /** Custom close confirmation message */
  closeConfirmMessage?: string;
}

/**
 * Options for opening a drawer
 */
export interface IOpenDrawerOptions<T extends IDrawerPayload = IDrawerPayload> {
  type: string;
  payload?: T;
}

/**
 * Drawer registry map type
 */
export type DrawerRegistryMap = Map<string, IDrawerDefinition>;

// ============================================================================
// Type-safe drawer declaration helpers
// ============================================================================

/**
 * Helper type to declare a drawer type with its payload
 * Usage in domain:
 *
 * declare module '@/layouts/drawers' {
 *   interface DrawerPayloads {
 *     product: { entityId: string; mode?: 'view' | 'edit' };
 *     'product-create': { categoryId?: string };
 *   }
 * }
 */
export interface DrawerPayloads {
  // Extend this interface via module augmentation in domains
  [key: string]: IDrawerPayload;
}

/**
 * Get payload type for a specific drawer type
 */
export type GetDrawerPayload<T extends keyof DrawerPayloads> = DrawerPayloads[T];

// ============================================================================
// Legacy support - will be deprecated
// ============================================================================

/** @deprecated Use string types with DrawerPayloads interface instead */
export enum DrawerTypes {
  PRODUCT = 'product',
  CATEGORY = 'category',
}

/** @deprecated Use IDrawerItem instead */
export interface IEntityDrawerItem {
  entityId?: string | number;
  type: DrawerTypes;
  uuid: string;
  isDirty?: boolean;
  close?: () => void;
  forceClose?: () => void;
  update?: (nextItem: Partial<IEntityDrawerItem>) => void;
}
