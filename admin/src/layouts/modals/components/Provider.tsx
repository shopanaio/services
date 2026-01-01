import { EntityModalsContext } from '@src/layouts/modals/context/context';
import { IEntityModalItem } from '@src/layouts/modals/types';
import { ReactNode } from 'react';

export const EntityModalsProvider = ({
  children,
  modalItem,
  onClose,
  onForceClose,
  onUpdate,
}: {
  children: ReactNode;
  modalItem: IEntityModalItem;
  onClose: () => void;
  onForceClose: () => void;
  onUpdate: (nextItem: Partial<IEntityModalItem>) => void;
}) => {
  return (
    <EntityModalsContext.Provider
      value={{
        ...modalItem,
        close: onClose,
        forceClose: onForceClose,
        update: onUpdate,
      }}
    >
      {children}
    </EntityModalsContext.Provider>
  );
};
