'use client';

import { useContext } from 'react';
import { DrawerContext } from '../context/context';
import type { IDrawerContext, IDrawerPayload, DrawerPayloads } from '../types';

/**
 * Hook to access drawer context inside a drawer component
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { payload, close, setDirty } = useDrawerContext();
 *
 * // With typed payload
 * const { payload } = useDrawerContext<ProductPayload>();
 * // payload.entityId is typed
 *
 * // Or using drawer type key
 * const { payload } = useDrawerContext<'product'>();
 * ```
 */
export function useDrawerContext<T extends IDrawerPayload = IDrawerPayload>(): IDrawerContext<T> {
  const context = useContext(DrawerContext);

  if (!context) {
    throw new Error(
      'useDrawerContext must be used within a DrawerProvider. ' +
        'Make sure your drawer component is registered and rendered through the Drawers component.'
    );
  }

  return context as unknown as IDrawerContext<T>;
}
