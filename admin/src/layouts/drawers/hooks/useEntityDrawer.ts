import { EntityDrawersContext } from '@src/layouts/drawers/context/context';
import { IEntityDrawerItem } from '@src/layouts/drawers/types';
import { useContext } from 'react';

export const useEntityDrawer = (): IEntityDrawerItem => {
  const context = useContext(EntityDrawersContext);

  if (context === undefined) {
    throw new Error(
      'useDrawerContext must be used within a DrawerContextProvider',
    );
  }

  return context || {};
};
