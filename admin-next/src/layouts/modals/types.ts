import { ComponentType, LazyExoticComponent } from 'react';

/**
 * Base payload interface for all modal stack items
 * Each item type extends this with its own payload shape
 */
export interface IModalStackPayload {
  entityId?: string | number;
  mode?: 'view' | 'edit' | 'create';
  [key: string]: unknown;
}

/**
 * Modal stack item stored in the state
 */
export interface IModalStackItem<T extends IModalStackPayload = IModalStackPayload> {
  uuid: string;
  type: string;
  payload: T;
  isDirty?: boolean;
}

/**
 * Context value provided to modal stack item components
 */
export interface IModalStackContext<T extends IModalStackPayload = IModalStackPayload> {
  uuid: string;
  type: string;
  payload: T;
  isDirty: boolean;
  pop: () => void;
  forcePop: () => void;
  setDirty: (dirty: boolean) => void;
  updatePayload: (payload: Partial<T>) => void;
}

/**
 * Modal stack item component type - can be regular or lazy loaded
 */
export type ModalStackComponent<T extends IModalStackPayload = IModalStackPayload> =
  | ComponentType<{}>
  | LazyExoticComponent<ComponentType<{}>>;

/**
 * Modal stack item definition for registration
 */
export interface IModalStackDefinition<T extends IModalStackPayload = IModalStackPayload> {
  type: string;
  component: ModalStackComponent<T>;
  /** Whether to show close confirmation when dirty */
  confirmOnDirtyClose?: boolean;
  /** Custom close confirmation message */
  closeConfirmMessage?: string;
}

/**
 * Options for pushing a modal stack item
 */
export interface IModalStackPushOptions<T extends IModalStackPayload = IModalStackPayload> {
  type: string;
  payload?: T;
}

/**
 * Modal stack registry map type
 */
export type ModalStackRegistryMap = Map<string, IModalStackDefinition>;

// ============================================================================
// Type-safe modal stack item declaration helpers
// ============================================================================

/**
 * Helper type to declare a modal stack item type with its payload
 * Usage in domain:
 *
 * declare module '@/layouts/modals' {
 *   interface ModalStackPayloads {
 *     product: { entityId: string; mode?: 'view' | 'edit' };
 *     'product-create': { categoryId?: string };
 *   }
 * }
 */
export interface ModalStackPayloads {
  // Extend this interface via module augmentation in domains
  [key: string]: IModalStackPayload;
}

/**
 * Get payload type for a specific modal stack item type
 */
export type GetModalStackPayload<T extends keyof ModalStackPayloads> = ModalStackPayloads[T];
