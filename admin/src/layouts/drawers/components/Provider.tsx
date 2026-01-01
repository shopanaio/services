import { ReactNode } from 'react';
import { DrawerContext, EntityDrawersContext } from '../context/context';
import type { IDrawerContext, IDrawerPayload, IEntityDrawerItem } from '../types';

interface IDrawerProviderProps {
  children: ReactNode;
  value: IDrawerContext;
}

/**
 * Provider component for drawer context
 * Wraps drawer content and provides access to drawer state and actions
 */
export const DrawerProvider = ({ children, value }: IDrawerProviderProps) => {
  return (
    <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>
  );
};

// ============================================================================
// Legacy support
// ============================================================================

interface ILegacyProviderProps {
  children: ReactNode;
  drawerItem: IEntityDrawerItem;
  onClose: () => void;
  onForceClose: () => void;
  onUpdate: (nextItem: Partial<IEntityDrawerItem>) => void;
}

/** @deprecated Use DrawerProvider instead */
export const EntityDrawersProvider = ({
  children,
  drawerItem,
  onClose,
  onForceClose,
  onUpdate,
}: ILegacyProviderProps) => {
  return (
    <EntityDrawersContext.Provider
      value={{
        ...drawerItem,
        close: onClose,
        forceClose: onForceClose,
        update: onUpdate,
      }}
    >
      {children}
    </EntityDrawersContext.Provider>
  );
};
