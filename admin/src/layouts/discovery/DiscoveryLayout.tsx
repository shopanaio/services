import { Outlet } from 'react-router-dom';

export const DiscoveryLayout = () => {
  return (
    <div className="content-layout">
      Discovery
      <Outlet />
    </div>
  );
};
