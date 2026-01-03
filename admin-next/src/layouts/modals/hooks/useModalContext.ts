'use client';

import { useContext } from 'react';
import { ModalContext } from '../context/context';
import type { IModalContext } from '../types';

/**
 * Hook to access the current modal context
 * Must be used within a ModalProvider
 *
 * @example
 * ```tsx
 * function MyModalContent() {
 *   const { payload, close, setDirty } = useModalContext();
 *
 *   return (
 *     <div>
 *       <p>Entity ID: {payload.entityId}</p>
 *       <button onClick={close}>Close</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useModalContext(): IModalContext {
  const context = useContext(ModalContext);

  if (context === undefined) {
    throw new Error('useModalContext must be used within a ModalProvider');
  }

  return context;
}
