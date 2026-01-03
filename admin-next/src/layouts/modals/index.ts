// ============================================================================
// Components
// ============================================================================
export { Stack, Modals } from './components/Modals';
export { StackItem, ModalWrapper } from './components/Modal';
export { StackItemProvider, ModalProvider } from './components/Provider';

// ============================================================================
// Registry
// ============================================================================
export {
  stackRegistry,
  registerStackItem,
  registerStackItems,
  // Legacy aliases
  modalRegistry,
  registerModal,
  registerModals,
} from './registry/modalRegistry';

// ============================================================================
// Store
// ============================================================================
export { useStackStore, useModalsStore } from './store/modals';

// ============================================================================
// Hooks
// ============================================================================
export { useStackItemContext, useModalContext } from './hooks/useModalContext';
export {
  useStack,
  useStackItem,
  createStackHook,
  // Legacy aliases
  useModal,
  useModalActions,
  createModalHook,
} from './hooks/useModal';

// ============================================================================
// Types
// ============================================================================
export type {
  // New names
  IStackPayload,
  IStackItem,
  IStackItemContext,
  IStackDefinition,
  IPushOptions,
  StackItemComponent,
  StackRegistryMap,
  StackPayloads,
  GetStackPayload,
  // Legacy aliases
  IModalPayload,
  IModalItem,
  IModalContext,
  IModalDefinition,
  IOpenModalOptions,
  ModalComponent,
  ModalRegistryMap,
  ModalPayloads,
  GetModalPayload,
} from './types';
