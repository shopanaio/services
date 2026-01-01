import { ErrorBoundary as RollbarErrorBoundary } from '@rollbar/react';
import { ReactNode } from 'react';
import { ErrorPage } from './ErrorPage';

interface IUnrecoverableErrorProps {
  children: ReactNode;
}

export const UnrecoverableError = ({ children }: IUnrecoverableErrorProps) => {
  return (
    <RollbarErrorBoundary fallbackUI={ErrorPage}>
      {children}
    </RollbarErrorBoundary>
  );
};
