'use client';

import { ReactNode } from 'react';
import { ModalStackContext } from '../context/context';
import type { IModalStackContext } from '../types';

interface IModalStackProviderProps {
  children: ReactNode;
  value: IModalStackContext;
}

/**
 * Provider component for modal stack item context
 * Wraps modal content and provides access to state and actions
 */
export const ModalStackProvider = ({ children, value }: IModalStackProviderProps) => {
  return (
    <ModalStackContext.Provider value={value}>{children}</ModalStackContext.Provider>
  );
};
