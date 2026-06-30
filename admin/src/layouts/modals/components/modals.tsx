'use client';

import { ModalStackItem } from './modal';
import { useModalStackStore } from '../store/modals';
import type { IModalStackItem } from '../types';

interface INestedModalStackProps {
  items: IModalStackItem[];
  totalCount: number;
  level?: number;
}

/**
 * Recursive component for rendering nested modal stack items
 */
const NestedModalStack = ({ items, totalCount, level = 0 }: INestedModalStackProps) => {
  const [current, ...rest] = items;

  const hasMore = rest.length > 0;

  return (
    <ModalStackItem item={current} level={level} totalCount={totalCount}>
      {hasMore && (
        <NestedModalStack items={rest} totalCount={totalCount} level={level + 1} />
      )}
    </ModalStackItem>
  );
};

/**
 * Root modal stack component
 * Renders all open modal stack items from the store
 *
 * Place this component once in your app layout:
 *
 * @example
 * ```tsx
 * // In app/layout.tsx or similar
 * import { ModalStack } from "@/layouts/modals";
 *
 * export default function Layout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <ModalStack />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export const ModalStack = () => {
  const items = useModalStackStore((state) => state.items);

  if (!items.length) {
    return null;
  }

  return <NestedModalStack items={items} totalCount={items.length} />;
};
