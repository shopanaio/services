import { ComponentType, LazyExoticComponent } from 'react';

/**
 * Base payload interface for all modals
 * Each modal type extends this with its own payload shape
 */
export interface IModalPayload {
  entityId?: string | number;
  mode?: 'view' | 'edit' | 'create';
  [key: string]: unknown;
}

/**
 * Modal item stored in the state
 */
export interface IModalItem<T extends IModalPayload = IModalPayload> {
  uuid: string;
  type: string;
  payload: T;
  isDirty?: boolean;
}

/**
 * Context value provided to modal components
 */
export interface IModalContext<T extends IModalPayload = IModalPayload> {
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
 * Modal component type - can be regular or lazy loaded
 */
export type ModalComponent<T extends IModalPayload = IModalPayload> =
  | ComponentType<{}>
  | LazyExoticComponent<ComponentType<{}>>;

/**
 * Modal definition for registration
 */
export interface IModalDefinition<T extends IModalPayload = IModalPayload> {
  type: string;
  component: ModalComponent<T>;
  /** Whether to show close confirmation when dirty */
  confirmOnDirtyClose?: boolean;
  /** Custom close confirmation message */
  closeConfirmMessage?: string;
}

/**
 * Options for opening a modal
 */
export interface IOpenModalOptions<T extends IModalPayload = IModalPayload> {
  type: string;
  payload?: T;
}

/**
 * Modal registry map type
 */
export type ModalRegistryMap = Map<string, IModalDefinition>;

// ============================================================================
// Type-safe modal declaration helpers
// ============================================================================

/**
 * Helper type to declare a modal type with its payload
 * Usage in domain:
 *
 * declare module '@/layouts/modals' {
 *   interface ModalPayloads {
 *     product: { entityId: string; mode?: 'view' | 'edit' };
 *     'product-create': { categoryId?: string };
 *   }
 * }
 */
export interface ModalPayloads {
  // Extend this interface via module augmentation in domains
  [key: string]: IModalPayload;
}

/**
 * Get payload type for a specific modal type
 */
export type GetModalPayload<T extends keyof ModalPayloads> = ModalPayloads[T];
