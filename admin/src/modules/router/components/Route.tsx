import { UnrecoverableError } from '@components/infra/ErrorBoundary';
import { ComponentType, Suspense } from 'react';

interface IRouteProps {
  errorBoundaryProps?: {};
  fallbackComponent?: () => JSX.Element;
}

const Fallback = ({ Component }: { Component?: ComponentType }) => {
  return Component ? <Component /> : null;
};

export const withRoute = (Component: ComponentType, props?: IRouteProps) => {
  return function AppRoute() {
    return (
      <UnrecoverableError {...props?.errorBoundaryProps}>
        <Suspense fallback={<Fallback Component={props?.fallbackComponent} />}>
          <Component />
        </Suspense>
      </UnrecoverableError>
    );
  };
};
