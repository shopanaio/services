'use client';

import { useCallback } from 'react';
import { useModalStackStore } from '../store/modals';
import type { IModalStackPayload } from '../types';

/**
 * Hook to get modal stack actions (push, pop, clear)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { push, pop, clear } = useModalStack();
 *
 *   return (
 *     <button onClick={() => push('product', { entityId: '123' })}>
 *       Open Product
 *     </button>
 *   );
 * }
 * ```
 */
export function useModalStack() {
  const push = useModalStackStore((state) => state.push);
  const pop = useModalStackStore((state) => state.pop);
  const clear = useModalStackStore((state) => state.clear);
  const peek = useModalStackStore((state) => state.peek);
  const size = useModalStackStore((state) => state.size);

  return {
    push,
    pop,
    clear,
    peek,
    size,
  };
}

/**
 * Hook to create a modal stack item pusher for a specific type
 *
 * @example
 * ```tsx
 * const useProductModal = createModalStackHook('product');
 *
 * function ProductList() {
 *   const { push } = useProductModal();
 *   return <button onClick={() => push({ entityId: '123' })}>View</button>;
 * }
 * ```
 */
export function createModalStackHook(type: string) {
  return function useTypedModalStack() {
    const pushToStack = useModalStackStore((state) => state.push);

    const push = useCallback(
      (payload?: IModalStackPayload) => {
        return pushToStack(type, payload);
      },
      [pushToStack]
    );

    return { push };
  };
}

/**
 * Generic hook to push a specific type onto the modal stack
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { push } = useModalStackItem('product');
 *
 *   return (
 *     <button onClick={() => push({ entityId: '123' })}>
 *       Open Product
 *     </button>
 *   );
 * }
 * ```
 */
export function useModalStackItem(type: string) {
  const pushToStack = useModalStackStore((state) => state.push);

  const push = useCallback(
    (payload?: IModalStackPayload) => {
      return pushToStack(type, payload);
    },
    [pushToStack, type]
  );

  return { push };
}
