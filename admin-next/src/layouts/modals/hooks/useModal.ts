'use client';

import { useCallback } from 'react';
import { useModalsStore } from '../store/modals';
import type { IModalPayload } from '../types';

/**
 * Hook to get modal actions (open, close, etc.)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { openModal, closeAllModals } = useModalActions();
 *
 *   return (
 *     <button onClick={() => openModal('product', { entityId: '123' })}>
 *       Open Product
 *     </button>
 *   );
 * }
 * ```
 */
export function useModalActions() {
  const openModal = useModalsStore((state) => state.openModal);
  const closeModal = useModalsStore((state) => state.closeModal);
  const closeTopModal = useModalsStore((state) => state.closeTopModal);
  const closeAllModals = useModalsStore((state) => state.closeAllModals);

  return {
    openModal,
    closeModal,
    closeTopModal,
    closeAllModals,
  };
}

/**
 * Hook to create a modal opener for a specific modal type
 *
 * @example
 * ```tsx
 * const useProductModal = createModalHook('product');
 *
 * function ProductList() {
 *   const { open } = useProductModal();
 *   return <button onClick={() => open({ entityId: '123' })}>View</button>;
 * }
 * ```
 */
export function createModalHook(type: string) {
  return function useTypedModal() {
    const openModal = useModalsStore((state) => state.openModal);

    const open = useCallback(
      (payload?: IModalPayload) => {
        return openModal(type, payload);
      },
      [openModal]
    );

    return { open };
  };
}

/**
 * Generic hook to open a modal
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { open } = useModal('product');
 *
 *   return (
 *     <button onClick={() => open({ entityId: '123' })}>
 *       Open Product
 *     </button>
 *   );
 * }
 * ```
 */
export function useModal(type: string) {
  const openModal = useModalsStore((state) => state.openModal);

  const open = useCallback(
    (payload?: IModalPayload) => {
      return openModal(type, payload);
    },
    [openModal, type]
  );

  return { open };
}
