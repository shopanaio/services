import { Badge } from 'antd';
import { ReactNode } from 'react';

export const ProjectsBadge = ({
  count,
  children,
  active,
  'data-testid': dataTestId,
}: {
  count: number;
  children: ReactNode;
  active: boolean;
  'data-testid': string;
}) => {
  return (
    <>
      {children}
      {count > 0 && (
        <Badge
          data-testid={dataTestId}
          count={count}
          size="default"
          color={active ? 'var(--color-primary-10)' : 'var(--color-gray-6)'}
          offset={[4, -2]}
        />
      )}
    </>
  );
};
