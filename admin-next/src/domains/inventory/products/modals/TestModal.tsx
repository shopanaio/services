'use client';

import { Button, Flex, Typography } from 'antd';
import { useStackItemContext, useStack } from '@/layouts/modals';

export const TestModal = () => {
  const { payload, pop, forcePop } = useStackItemContext();
  const { push } = useStack();

  const level = (payload.level as number) || 1;

  const handleOpenAnother = () => {
    push('product-test', { level: level + 1 });
  };

  return (
    <Flex
      vertical
      align="center"
      justify="center"
      gap="large"
      style={{
        height: '100%',
        background: `hsl(${(level * 30) % 360}, 70%, 95%)`,
      }}
    >
      <Typography.Title level={2}>
        Test Modal - Level {level}
      </Typography.Title>

      <Typography.Text type="secondary">
        This modal can open another instance of itself to test stacking
      </Typography.Text>

      <Flex gap="middle">
        <Button type="primary" size="large" onClick={handleOpenAnother}>
          Open Another Modal (Level {level + 1})
        </Button>

        <Button size="large" onClick={pop}>
          Close
        </Button>

        <Button danger size="large" onClick={forcePop}>
          Force Close
        </Button>
      </Flex>

      <Typography.Text type="secondary" style={{ marginTop: 40 }}>
        Payload: {JSON.stringify(payload)}
      </Typography.Text>
    </Flex>
  );
};
