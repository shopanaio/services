'use client';

import { ReactNode } from 'react';
import { StackItemContext } from '../context/context';
import type { IStackItemContext } from '../types';

interface IStackItemProviderProps {
  children: ReactNode;
  value: IStackItemContext;
}

/**
 * Provider component for stack item context
 * Wraps stack item content and provides access to state and actions
 */
export const StackItemProvider = ({ children, value }: IStackItemProviderProps) => {
  return (
    <StackItemContext.Provider value={value}>{children}</StackItemContext.Provider>
  );
};

// ============================================================================
// Legacy alias (deprecated, for backwards compatibility)
// ============================================================================

/** @deprecated Use StackItemProvider instead */
export const ModalProvider = StackItemProvider;
