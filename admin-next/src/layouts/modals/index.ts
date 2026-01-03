// ============================================================================
// Components
// ============================================================================
export { ModalStack } from './components/Modals';
export { ModalStackItem } from './components/Modal';
export { ModalStackProvider } from './components/Provider';

// ============================================================================
// Registry
// ============================================================================
export {
  modalStackRegistry,
  registerModalStackItem,
  registerModalStackItems,
} from './registry/modalRegistry';

// ============================================================================
// Store
// ============================================================================
export { useModalStackStore } from './store/modals';

// ============================================================================
// Hooks
// ============================================================================
export { useModalStackContext } from './hooks/useModalContext';
export {
  useModalStack,
  useModalStackItem,
  createModalStackHook,
} from './hooks/useModal';

// ============================================================================
// Types
// ============================================================================
export type {
  IModalStackPayload,
  IModalStackItem,
  IModalStackContext,
  IModalStackDefinition,
  IModalStackPushOptions,
  ModalStackComponent,
  ModalStackRegistryMap,
  ModalStackPayloads,
  GetModalStackPayload,
} from './types';
