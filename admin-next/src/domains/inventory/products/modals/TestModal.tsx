'use client';

import { Button, Flex, Typography } from 'antd';
import { useModalContext, useModalActions } from '@/layouts/modals';

export const TestModal = () => {
  const { payload, close, forceClose } = useModalContext();
  const { openModal } = useModalActions();

  const level = (payload.level as number) || 1;

  const handleOpenAnother = () => {
    openModal('product-test', { level: level + 1 });
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

        <Button size="large" onClick={close}>
          Close
        </Button>

        <Button danger size="large" onClick={forceClose}>
          Force Close
        </Button>
      </Flex>

      <Typography.Text type="secondary" style={{ marginTop: 40 }}>
        Payload: {JSON.stringify(payload)}
      </Typography.Text>
    </Flex>
  );
};
