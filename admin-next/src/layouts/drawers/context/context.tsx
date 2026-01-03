'use client';

import { createContext } from 'react';
import type { IDrawerContext, IEntityDrawerItem } from '../types';

/**
 * Context for drawer components
 * Provides access to drawer state and actions
 */
export const DrawerContext = createContext<IDrawerContext | undefined>(undefined);

/**
 * @deprecated Use DrawerContext instead
 */
export const EntityDrawersContext = createContext<IEntityDrawerItem | undefined>(
  undefined
);
