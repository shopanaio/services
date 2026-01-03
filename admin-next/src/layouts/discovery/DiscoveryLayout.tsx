import { ReactNode } from 'react';

interface DiscoveryLayoutProps {
  children?: ReactNode;
}

export const DiscoveryLayout = ({ children }: DiscoveryLayoutProps) => {
  return (
    <div className="discovery-layout">
      {children}
    </div>
  );
};
