'use client';

import { DrawerWrapper } from './Drawer';
import { useDrawersStore } from '../store/drawers';
import type { IDrawerItem } from '../types';

interface INestedDrawersProps {
  items: IDrawerItem[];
  level?: number;
}

/**
 * Recursive component for rendering nested drawers
 */
const NestedDrawers = ({ items, level = 0 }: INestedDrawersProps) => {
  const [current, ...rest] = items;

  const hasMore = rest.length > 0;

  return (
    <DrawerWrapper drawerItem={current} level={level}>
      {hasMore && <NestedDrawers items={rest} level={level + 1} />}
    </DrawerWrapper>
  );
};

/**
 * Root drawers component
 * Renders all open drawers from the store
 *
 * Place this component once in your app layout:
 *
 * @example
 * ```tsx
 * // In app/layout.tsx or similar
 * import { Drawers } from '@/layouts/drawers';
 *
 * export default function Layout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <Drawers />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export const Drawers = () => {
  const drawers = useDrawersStore((state) => state.drawers);

  if (!drawers.length) {
    return null;
  }

  return <NestedDrawers items={drawers} />;
};
