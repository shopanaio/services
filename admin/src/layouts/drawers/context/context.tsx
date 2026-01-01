import { IEntityDrawerItem } from '@src/layouts/drawers/types';
import { createContext } from 'react';

export const EntityDrawersContext = createContext<IEntityDrawerItem | void>(
  undefined,
);
