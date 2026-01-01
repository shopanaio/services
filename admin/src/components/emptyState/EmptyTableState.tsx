import { memo, useEffect, useState } from 'react';
import {
  EmptyState,
  IEmptyStateProps,
} from '@components/emptyState/EmptyState';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import noDataLottie from './folder.json';

const NotFoundElement = (props: Partial<IEmptyStateProps>) => (
  <Flex
    justify="center"
    direction="column"
    align="center"
    minH={props?.height || '400px'}
    css={css`
      & .empty-state-image {
        opacity: 0.8;
      }
    `}
  >
    <EmptyState
      data-testid="table-empty-state"
      lottie={props.lottie || noDataLottie}
      title={props.title || 'Whoops!'}
      subtitle={props.subtitle || 'No data found'}
    />
  </Flex>
);

export const NotFoundTableElement = memo(
  ({
    loading,
    height = '300px',
    ...props
  }: Partial<IEmptyStateProps> & {
    loading?: boolean;
  }) => {
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
      setIsActive(!loading);
    }, [loading]);

    if (!isActive) {
      return (
        <div
          css={css`
            min-height: ${height};
          `}
        />
      );
    }

    return <NotFoundElement {...props} height={height} />;
  },
);
