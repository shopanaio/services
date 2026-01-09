// ============================================================================
// Components
// ============================================================================
export { ModalStack } from './components/modals';
export { ModalStackItem } from './components/modal';
export { ModalStackProvider } from './components/provider';
export { ModalLayout } from './components/modal-layout';
export { ModalHeader } from './components/modal-header';
export type { IModalHeaderProps } from './components/modal-header';

// ============================================================================
// Registry
// ============================================================================
export {
  modalStackRegistry,
  registerModalStackItem,
  registerModalStackItems,
} from './registry/modal-registry';

// ============================================================================
// Store
// ============================================================================
export { useModalStackStore } from './store/modals';

// ============================================================================
// Hooks
// ============================================================================
export { useModalStackContext } from './hooks/use-modal-context';
export {
  useModalStack,
  useModalStackItem,
  createModalStackHook,
} from './hooks/use-modal';

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
