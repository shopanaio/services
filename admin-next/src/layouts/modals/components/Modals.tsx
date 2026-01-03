'use client';

import { StackItem } from './Modal';
import { useStackStore } from '../store/modals';
import type { IStackItem } from '../types';

interface INestedStackProps {
  items: IStackItem[];
  totalCount: number;
  level?: number;
}

/**
 * Recursive component for rendering nested stack items
 */
const NestedStack = ({ items, totalCount, level = 0 }: INestedStackProps) => {
  const [current, ...rest] = items;

  const hasMore = rest.length > 0;

  return (
    <StackItem stackItem={current} level={level} totalCount={totalCount}>
      {hasMore && (
        <NestedStack items={rest} totalCount={totalCount} level={level + 1} />
      )}
    </StackItem>
  );
};

/**
 * Root stack component
 * Renders all open stack items from the store
 *
 * Place this component once in your app layout:
 *
 * @example
 * ```tsx
 * // In app/layout.tsx or similar
 * import { Stack } from '@/layouts/modals';
 *
 * export default function Layout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <Stack />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export const Stack = () => {
  const items = useStackStore((state) => state.items);

  if (!items.length) {
    return null;
  }

  return <NestedStack items={items} totalCount={items.length} />;
};

// ============================================================================
// Legacy alias (deprecated, for backwards compatibility)
// ============================================================================

/** @deprecated Use Stack instead */
export const Modals = Stack;
