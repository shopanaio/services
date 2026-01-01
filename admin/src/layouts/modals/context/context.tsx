import { IEntityModalItem } from '@src/layouts/modals/types';
import { createContext } from 'react';

export const EntityModalsContext = createContext<IEntityModalItem | void>(
  undefined,
);
