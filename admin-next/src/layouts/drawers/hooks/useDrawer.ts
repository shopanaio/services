'use client';

import { useCallback } from 'react';
import { useDrawersStore } from '../store/drawers';
import { drawerRegistry } from '../registry/drawerRegistry';
import type { DrawerPayloads, IDrawerPayload } from '../types';

/**
 * Hook to open a drawer by type
 *
 * @example
 * ```tsx
 * // Basic usage - type is inferred from registered drawers
 * const openProduct = useDrawer('product');
 * openProduct({ entityId: '123' });
 *
 * // With mode
 * openProduct({ entityId: '123', mode: 'edit' });
 *
 * // Create mode
 * const openCreateProduct = useDrawer('product');
 * openCreateProduct({ mode: 'create', categoryId: 'electronics' });
 * ```
 */
export function useDrawer<T extends keyof DrawerPayloads>(
  type: T
): (payload?: DrawerPayloads[T]) => string {
  const openDrawer = useDrawersStore((state) => state.openDrawer);

  return useCallback(
    (payload?: DrawerPayloads[T]) => {
      if (!drawerRegistry.has(type as string)) {
        console.warn(
          `[useDrawer] Drawer type "${String(type)}" is not registered. ` +
            'Make sure to register it using drawerRegistry.register() or registerDrawer().'
        );
      }

      return openDrawer(type, payload);
    },
    [type, openDrawer]
  );
}

/**
 * Hook to get drawer actions (open, close, etc.)
 *
 * @example
 * ```tsx
 * const { open, closeTop, closeAll } = useDrawerActions();
 *
 * // Open with type
 * open('product', { entityId: '123' });
 *
 * // Close topmost drawer
 * closeTop();
 * ```
 */
export function useDrawerActions() {
  const { openDrawer, closeDrawer, closeTopDrawer, closeAllDrawers } =
    useDrawersStore();

  const open = useCallback(
    <T extends keyof DrawerPayloads>(type: T, payload?: DrawerPayloads[T]) => {
      if (!drawerRegistry.has(type as string)) {
        console.warn(
          `[useDrawerActions] Drawer type "${String(type)}" is not registered.`
        );
      }
      return openDrawer(type, payload);
    },
    [openDrawer]
  );

  return {
    open,
    close: closeDrawer,
    closeTop: closeTopDrawer,
    closeAll: closeAllDrawers,
  };
}

/**
 * Factory to create a typed drawer hook for a specific drawer type
 *
 * @example
 * ```tsx
 * // In your domain module
 * export const useProductDrawer = createDrawerHook<ProductPayload>('product');
 *
 * // Usage
 * const openProduct = useProductDrawer();
 * openProduct({ entityId: '123' });
 * ```
 */
export function createDrawerHook<T extends IDrawerPayload>(type: string) {
  return function useTypedDrawer() {
    const openDrawer = useDrawersStore((state) => state.openDrawer);

    return useCallback(
      (payload?: T) => {
        if (!drawerRegistry.has(type)) {
          console.warn(
            `[createDrawerHook] Drawer type "${type}" is not registered.`
          );
        }
        return openDrawer(
          type as keyof DrawerPayloads,
          payload as DrawerPayloads[keyof DrawerPayloads]
        );
      },
      [openDrawer]
    );
  };
}
