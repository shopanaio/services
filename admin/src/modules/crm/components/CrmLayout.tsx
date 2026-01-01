import { Box } from '@components/utility/Box';

import { LayoutSkeleton } from '@src/layouts/table/components/Skeleton';
import { useInitialDelay } from '@src/hooks/useInitialDelay';
import {
  ITableLayoutHeaderProps,
  TableLayoutHeader,
} from '@src/layouts/table/components/Header';
import { css } from '@emotion/react';
import {
  UiFilterWidget,
  IUiFilterWidgetProps,
} from '@components/filters/UiFilterWidget/UiFilterWidget';

export interface IOrderFunnelLayoutProps {
  name?: string;
  headerProps: ITableLayoutHeaderProps;
  navigationProps: IUiFilterWidgetProps;
  loading?: boolean;
  children: React.ReactNode;
}

export const CrmLayout = ({
  name,
  headerProps,
  navigationProps,
  children,
}: IOrderFunnelLayoutProps) => {
  const ready = useInitialDelay();

  if (!ready) {
    return <LayoutSkeleton />;
  }

  return (
    <Box pt="4" px="4" data-testid={`${name || 'data'}-layout`}>
      <TableLayoutHeader {...headerProps} />
      <Box
        css={css`
          background-color: var(--bg-gradient);
          bottom: 0;
          margin: 0 -15px;
          overflow: hidden;
          padding: var(--x4) var(--x4) 1px;
        `}
      >
        <UiFilterWidget {...navigationProps} />
      </Box>
      {children}
    </Box>
  );
};
