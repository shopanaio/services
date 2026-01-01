import { EntityDrawersContext } from '@src/layouts/drawers/context/context';
import { IEntityDrawerItem } from '@src/layouts/drawers/types';
import { ReactNode } from 'react';

export const EntityDrawersProvider = ({
  children,
  drawerItem,
  onClose,
  onForceClose,
  onUpdate,
}: {
  children: ReactNode;
  drawerItem: IEntityDrawerItem;
  onClose: () => void;
  onForceClose: () => void;
  onUpdate: (nextItem: Partial<IEntityDrawerItem>) => void;
}) => {
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
