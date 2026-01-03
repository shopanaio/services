'use client';

import { ModalWrapper } from './Modal';
import { useModalsStore } from '../store/modals';
import type { IModalItem } from '../types';

interface INestedModalsProps {
  items: IModalItem[];
  totalCount: number;
  level?: number;
}

/**
 * Recursive component for rendering nested modals
 */
const NestedModals = ({ items, totalCount, level = 0 }: INestedModalsProps) => {
  const [current, ...rest] = items;

  const hasMore = rest.length > 0;

  return (
    <ModalWrapper modalItem={current} level={level} totalCount={totalCount}>
      {hasMore && (
        <NestedModals items={rest} totalCount={totalCount} level={level + 1} />
      )}
    </ModalWrapper>
  );
};

/**
 * Root modals component
 * Renders all open modals from the store
 *
 * Place this component once in your app layout:
 *
 * @example
 * ```tsx
 * // In app/layout.tsx or similar
 * import { Modals } from '@/layouts/modals';
 *
 * export default function Layout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <Modals />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export const Modals = () => {
  const modals = useModalsStore((state) => state.modals);

  if (!modals.length) {
    return null;
  }

  return <NestedModals items={modals} totalCount={modals.length} />;
};
