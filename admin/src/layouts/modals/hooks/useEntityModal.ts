import { EntityModalsContext } from '@src/layouts/modals/context/context';
import { IEntityModalItem } from '@src/layouts/modals/types';
import { useContext } from 'react';

export const useEntityModal = (): IEntityModalItem => {
  const context = useContext(EntityModalsContext);

  if (context === undefined) {
    throw new Error(
      'useModalContext must be used within a ModalContextProvider',
    );
  }

  return context || {};
};
