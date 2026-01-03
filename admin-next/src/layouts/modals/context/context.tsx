'use client';

import { createContext } from 'react';
import type { IModalStackContext } from '../types';

/**
 * Context for modal stack item components
 * Provides access to item state and actions
 */
export const ModalStackContext = createContext<IModalStackContext | undefined>(undefined);
