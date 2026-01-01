import { Flex } from '@components/utility/Flex';
import { Spin } from 'antd';

export const AppLoader = () => {
  return (
    <Flex w="100%" h="100vh" justify="center" align="center">
      <Spin spinning />
    </Flex>
  );
};
