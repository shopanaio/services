import { EntityDrawersContext } from '@src/layouts/drawers/context/context';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { useContext } from 'react';

export const useEntityDrawerType = (): DrawerTypes | null => {
  const context = useContext(EntityDrawersContext);

  if (context === undefined) {
    throw new Error(
      'useDrawerContext must be used within a DrawerContextProvider',
    );
  }

  return context?.type || null;
};
