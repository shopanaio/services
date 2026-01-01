import { EntityModalsContext } from '@src/layouts/modals/context/context';
import { ModalTypes } from '@src/layouts/modals/types';
import { useContext } from 'react';

export const useEntityModalType = (): ModalTypes | null => {
  const context = useContext(EntityModalsContext);

  if (context === undefined) {
    throw new Error(
      'useModalContext must be used within a ModalContextProvider',
    );
  }

  return context?.type || null;
};
