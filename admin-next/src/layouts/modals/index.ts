// ============================================================================
// Components
// ============================================================================
export { Modals } from './components/Modals';
export { ModalWrapper } from './components/Modal';
export { ModalProvider } from './components/Provider';

// ============================================================================
// Registry
// ============================================================================
export {
  modalRegistry,
  registerModal,
  registerModals,
} from './registry/modalRegistry';

// ============================================================================
// Store
// ============================================================================
export { useModalsStore } from './store/modals';

// ============================================================================
// Hooks
// ============================================================================
export { useModalContext } from './hooks/useModalContext';
export { useModal, useModalActions, createModalHook } from './hooks/useModal';

// ============================================================================
// Types
// ============================================================================
export type {
  IModalPayload,
  IModalItem,
  IModalContext,
  IModalDefinition,
  IOpenModalOptions,
  ModalComponent,
  ModalRegistryMap,
} from './types';
