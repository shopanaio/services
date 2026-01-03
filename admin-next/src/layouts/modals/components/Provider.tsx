'use client';

import { ReactNode } from 'react';
import { ModalContext } from '../context/context';
import type { IModalContext } from '../types';

interface IModalProviderProps {
  children: ReactNode;
  value: IModalContext;
}

/**
 * Provider component for modal context
 * Wraps modal content and provides access to modal state and actions
 */
export const ModalProvider = ({ children, value }: IModalProviderProps) => {
  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};
