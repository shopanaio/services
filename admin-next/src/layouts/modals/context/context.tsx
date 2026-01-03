'use client';

import { createContext } from 'react';
import type { IModalContext } from '../types';

/**
 * Context for modal components
 * Provides access to modal state and actions
 */
export const ModalContext = createContext<IModalContext | undefined>(undefined);
