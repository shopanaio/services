import { Paper } from '@components/paper/Paper';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { Skeleton } from 'antd';
import SkeletonButton from 'antd/es/skeleton/Button';

const FiltersSkeleton = () => {
  return (
    <div
      css={css`
        margin-top: var(--x4);
        margin-bottom: var(--x2);
        padding: var(--x1);
        width: 100%;
        box-sizing: border-box;
        background: #fff;
      `}
    >
      <div
        css={css`
          max-width: 90px;
        `}
      >
        <Skeleton.Button block size="default" active shape="default" />
      </div>
    </div>
  );
};

const HeaderSkeleton = () => {
  return (
    <Flex h="32px" justify="space-between" align="center">
      <Box w="150px">
        <SkeletonButton block active shape="round" size="small" />
      </Box>
      <Box w="100px">
        <SkeletonButton active block />
      </Box>
    </Flex>
  );
};
export const LayoutSkeleton = ({ filters = true }: { filters?: boolean }) => {
  return (
    <Box py="4" px="6">
      <HeaderSkeleton />
      {filters && <FiltersSkeleton />}
      <Paper
        css={css`
          margin-top: var(--x3);
        `}
      >
        <Flex gap="6" px="6" py="10" direction="column">
          <Skeleton active paragraph={{ rows: 5 }} />
        </Flex>
      </Paper>
    </Box>
  );
};

export const DrawerSkeleton = () => {
  return <LayoutSkeleton filters={false} />;
}
