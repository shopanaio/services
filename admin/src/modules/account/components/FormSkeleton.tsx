import { FullLogo } from '@components/logo/FullLogo';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { Skeleton } from 'antd';
import SkeletonButton from 'antd/es/skeleton/Button';

export const AccountFormSkeleton = () => {
  return (
    <Box>
      <Flex justify="space-between" align="center" h="10" mb="10">
        <FullLogo size={20} noText />
        <Flex gap="4">
          <SkeletonButton active />
          <SkeletonButton active />
        </Flex>
      </Flex>
      <Skeleton active />
    </Box>
  );
};
