'use client';

import { useContext } from 'react';
import { StackItemContext } from '../context/context';
import type { IStackItemContext } from '../types';

/**
 * Hook to access the current stack item context
 * Must be used within a StackItemProvider
 *
 * @example
 * ```tsx
 * function MyStackItemContent() {
 *   const { payload, pop, setDirty } = useStackItemContext();
 *
 *   return (
 *     <div>
 *       <p>Entity ID: {payload.entityId}</p>
 *       <button onClick={pop}>Close</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useStackItemContext(): IStackItemContext {
  const context = useContext(StackItemContext);

  if (context === undefined) {
    throw new Error('useStackItemContext must be used within a StackItemProvider');
  }

  return context;
}

// ============================================================================
// Legacy alias (deprecated, for backwards compatibility)
// ============================================================================

/** @deprecated Use useStackItemContext instead */
export const useModalContext = useStackItemContext;
