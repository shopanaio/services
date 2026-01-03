'use client';

import { createContext } from 'react';
import type { IStackItemContext } from '../types';

/**
 * Context for stack item components
 * Provides access to stack item state and actions
 */
export const StackItemContext = createContext<IStackItemContext | undefined>(undefined);

// ============================================================================
// Legacy alias (deprecated, for backwards compatibility)
// ============================================================================

/** @deprecated Use StackItemContext instead */
export const ModalContext = StackItemContext;
