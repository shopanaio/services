'use client';

import { useCallback } from 'react';
import { useStackStore } from '../store/modals';
import type { IStackPayload } from '../types';

/**
 * Hook to get stack actions (push, pop, clear)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { push, pop, clear } = useStack();
 *
 *   return (
 *     <button onClick={() => push('product', { entityId: '123' })}>
 *       Open Product
 *     </button>
 *   );
 * }
 * ```
 */
export function useStack() {
  const push = useStackStore((state) => state.push);
  const pop = useStackStore((state) => state.pop);
  const clear = useStackStore((state) => state.clear);
  const peek = useStackStore((state) => state.peek);
  const size = useStackStore((state) => state.size);

  return {
    push,
    pop,
    clear,
    peek,
    size,
  };
}

/**
 * Hook to create a stack item pusher for a specific type
 *
 * @example
 * ```tsx
 * const useProductStack = createStackHook('product');
 *
 * function ProductList() {
 *   const { push } = useProductStack();
 *   return <button onClick={() => push({ entityId: '123' })}>View</button>;
 * }
 * ```
 */
export function createStackHook(type: string) {
  return function useTypedStack() {
    const pushToStack = useStackStore((state) => state.push);

    const push = useCallback(
      (payload?: IStackPayload) => {
        return pushToStack(type, payload);
      },
      [pushToStack]
    );

    return { push };
  };
}

/**
 * Generic hook to push a specific type onto the stack
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { push } = useStackItem('product');
 *
 *   return (
 *     <button onClick={() => push({ entityId: '123' })}>
 *       Open Product
 *     </button>
 *   );
 * }
 * ```
 */
export function useStackItem(type: string) {
  const pushToStack = useStackStore((state) => state.push);

  const push = useCallback(
    (payload?: IStackPayload) => {
      return pushToStack(type, payload);
    },
    [pushToStack, type]
  );

  return { push };
}

// ============================================================================
// Legacy aliases (deprecated, for backwards compatibility)
// ============================================================================

/** @deprecated Use useStack instead */
export const useModalActions = useStack;

/** @deprecated Use createStackHook instead */
export const createModalHook = createStackHook;

/** @deprecated Use useStackItem instead */
export const useModal = useStackItem;
