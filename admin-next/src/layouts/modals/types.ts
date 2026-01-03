import { ComponentType, LazyExoticComponent } from 'react';

/**
 * Base payload interface for all stack items
 * Each stack item type extends this with its own payload shape
 */
export interface IStackPayload {
  entityId?: string | number;
  mode?: 'view' | 'edit' | 'create';
  [key: string]: unknown;
}

/**
 * Stack item stored in the state
 */
export interface IStackItem<T extends IStackPayload = IStackPayload> {
  uuid: string;
  type: string;
  payload: T;
  isDirty?: boolean;
}

/**
 * Context value provided to stack item components
 */
export interface IStackItemContext<T extends IStackPayload = IStackPayload> {
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
 * Stack item component type - can be regular or lazy loaded
 */
export type StackItemComponent<T extends IStackPayload = IStackPayload> =
  | ComponentType<{}>
  | LazyExoticComponent<ComponentType<{}>>;

/**
 * Stack item definition for registration
 */
export interface IStackDefinition<T extends IStackPayload = IStackPayload> {
  type: string;
  component: StackItemComponent<T>;
  /** Whether to show close confirmation when dirty */
  confirmOnDirtyClose?: boolean;
  /** Custom close confirmation message */
  closeConfirmMessage?: string;
}

/**
 * Options for pushing a stack item
 */
export interface IPushOptions<T extends IStackPayload = IStackPayload> {
  type: string;
  payload?: T;
}

/**
 * Stack registry map type
 */
export type StackRegistryMap = Map<string, IStackDefinition>;

// ============================================================================
// Type-safe stack item declaration helpers
// ============================================================================

/**
 * Helper type to declare a stack item type with its payload
 * Usage in domain:
 *
 * declare module '@/layouts/modals' {
 *   interface StackPayloads {
 *     product: { entityId: string; mode?: 'view' | 'edit' };
 *     'product-create': { categoryId?: string };
 *   }
 * }
 */
export interface StackPayloads {
  // Extend this interface via module augmentation in domains
  [key: string]: IStackPayload;
}

/**
 * Get payload type for a specific stack item type
 */
export type GetStackPayload<T extends keyof StackPayloads> = StackPayloads[T];

// ============================================================================
// Legacy aliases (deprecated, for backwards compatibility)
// ============================================================================

/** @deprecated Use IStackPayload instead */
export type IModalPayload = IStackPayload;

/** @deprecated Use IStackItem instead */
export type IModalItem<T extends IStackPayload = IStackPayload> = IStackItem<T>;

/** @deprecated Use IStackItemContext instead */
export type IModalContext<T extends IStackPayload = IStackPayload> = IStackItemContext<T>;

/** @deprecated Use StackItemComponent instead */
export type ModalComponent<T extends IStackPayload = IStackPayload> = StackItemComponent<T>;

/** @deprecated Use IStackDefinition instead */
export type IModalDefinition<T extends IStackPayload = IStackPayload> = IStackDefinition<T>;

/** @deprecated Use IPushOptions instead */
export type IOpenModalOptions<T extends IStackPayload = IStackPayload> = IPushOptions<T>;

/** @deprecated Use StackRegistryMap instead */
export type ModalRegistryMap = StackRegistryMap;

/** @deprecated Use StackPayloads instead */
export type ModalPayloads = StackPayloads;

/** @deprecated Use GetStackPayload instead */
export type GetModalPayload<T extends keyof StackPayloads> = GetStackPayload<T>;
