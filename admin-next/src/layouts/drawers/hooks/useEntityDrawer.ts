import { useContext } from 'react';
import { EntityDrawersContext } from '../context/context';

export const useEntityDrawer = () => {
  const context = useContext(EntityDrawersContext);
  if (!context) {
    throw new Error('useEntityDrawer must be used within EntityDrawersProvider');
  }
  return context;
};
