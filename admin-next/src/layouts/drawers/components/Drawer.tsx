'use client';

import { App, Drawer } from 'antd';
import { ReactNode, Suspense, useState, useMemo } from 'react';
import { useDrawersStore } from '../store/drawers';
import { drawerRegistry } from '../registry/drawerRegistry';
import { DrawerProvider } from './Provider';
import type { IDrawerItem, IDrawerContext } from '../types';

interface IDrawerWrapperProps {
  children?: ReactNode;
  level: number;
  drawerItem: IDrawerItem;
}

const DEFAULT_WIDTH = 'calc(100vw - 100px)';
const DEFAULT_CONFIRM_MESSAGE =
  'You have unsaved changes. Are you sure you want to leave?';

/**
 * Single drawer wrapper component
 * Handles drawer lifecycle, dirty state confirmation, and rendering
 */
export const DrawerWrapper = ({
  children = null,
  drawerItem,
  level,
}: IDrawerWrapperProps) => {
  const { uuid, type, payload, isDirty } = drawerItem;
  const [isOpen, setIsOpen] = useState(true);
  const { modal } = App.useApp();
  const { closeDrawer, setDirty, updatePayload } = useDrawersStore();

  // Get drawer definition from registry
  const definition = drawerRegistry.get(type);

  const clearAfterClose = (open: boolean) => {
    if (open) return;
    closeDrawer(uuid);
  };

  const onClose = async () => {
    if (isDirty) {
      const confirmMessage =
        definition?.closeConfirmMessage ?? DEFAULT_CONFIRM_MESSAGE;
      const shouldConfirm = definition?.confirmOnDirtyClose ?? true;

      if (shouldConfirm) {
        const result = await modal.confirm({
          icon: null,
          title: 'Unsaved changes',
          content: confirmMessage,
        });
        if (!result) return;
      }
    }
    setIsOpen(false);
  };

  const onForceClose = () => {
    setIsOpen(false);
  };

  const onSetDirty = (dirty: boolean) => {
    setDirty(uuid, dirty);
  };

  const onUpdatePayload = (newPayload: typeof payload) => {
    updatePayload(uuid, newPayload);
  };

  // Context value for drawer component
  const contextValue: IDrawerContext = useMemo(
    () => ({
      uuid,
      type,
      payload,
      isDirty: isDirty ?? false,
      close: onClose,
      forceClose: onForceClose,
      setDirty: onSetDirty,
      updatePayload: onUpdatePayload,
    }),
    [uuid, type, payload, isDirty]
  );

  // Get component from registry
  const Component = definition?.component;

  if (!Component) {
    console.error(
      `[DrawerWrapper] Unknown drawer type: "${type}". ` +
        'Make sure to register it using drawerRegistry.register().'
    );
    return null;
  }

  const width = definition?.width ?? DEFAULT_WIDTH;

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      afterOpenChange={clearAfterClose}
      placement="right"
      width={width}
      push={{ distance: children ? 100 : 0 }}
      closeIcon={null}
      styles={{ body: { padding: 0 } }}
    >
      <Suspense fallback={null}>
        <DrawerProvider value={contextValue}>
          <Component />
        </DrawerProvider>
      </Suspense>
      {children}
    </Drawer>
  );
};

// ============================================================================
// Legacy support - keeping old component name for backward compatibility
// ============================================================================

/** @deprecated Use DrawerWrapper instead */
export const EntityDrawer = DrawerWrapper;
