import { Provider } from '@rollbar/react';
import { ReactNode } from 'react';

const rollbarConfig = {
  captureUncaught: true,
  captureUnhandledRejections: true,
  enabled: false,
};

interface IRollbarProps {
  children: ReactNode;
}

export function Rollbar({ children }: IRollbarProps) {
  return <Provider config={rollbarConfig}>{children}</Provider>;
}
