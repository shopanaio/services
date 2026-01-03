'use client';

import { Typography, Flex, Button, Card, List } from 'antd';
import { useDrawerContext } from '@/layouts/drawers';
import type { CategoryDrawerPayload } from './types';

const mockCategories: Record<
  string,
  {
    id: string;
    name: string;
    description: string;
    productCount: number;
  }
> = {
  Electronics: {
    id: 'Electronics',
    name: 'Electronics',
    description: 'Smartphones, tablets, and other electronic devices',
    productCount: 4,
  },
  Computers: {
    id: 'Computers',
    name: 'Computers',
    description: 'Laptops, desktops, and computer accessories',
    productCount: 2,
  },
  Audio: {
    id: 'Audio',
    name: 'Audio',
    description: 'Headphones, speakers, and audio equipment',
    productCount: 2,
  },
  Gaming: {
    id: 'Gaming',
    name: 'Gaming',
    description: 'Gaming consoles and accessories',
    productCount: 1,
  },
  Accessories: {
    id: 'Accessories',
    name: 'Accessories',
    description: 'Computer peripherals and accessories',
    productCount: 1,
  },
};

/**
 * Category drawer component
 * Uses the new typed drawer context API
 */
export const CategoryDrawer = () => {
  const { payload, close } = useDrawerContext<CategoryDrawerPayload>();

  const category = mockCategories[String(payload.entityId)];

  if (!category) {
    return (
      <Flex
        vertical
        align="center"
        justify="center"
        style={{ height: '100%', padding: 24 }}
      >
        <Typography.Text type="secondary">Category not found</Typography.Text>
      </Flex>
    );
  }

  return (
    <Flex vertical style={{ height: '100%' }}>
      <Flex
        justify="space-between"
        align="center"
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-container)',
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Category: {category.name}
        </Typography.Title>
        <Button onClick={close}>Close</Button>
      </Flex>

      <Flex
        vertical
        style={{ padding: 24, flex: 1, overflow: 'auto' }}
        gap="middle"
      >
        <Card title="Details">
          <Typography.Paragraph>
            <strong>Name:</strong> {category.name}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <strong>Description:</strong> {category.description}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <strong>Products:</strong> {category.productCount} items
          </Typography.Paragraph>
        </Card>

        <Card title="Category Settings">
          <List
            size="small"
            dataSource={[
              'Show in navigation: Yes',
              'Show in filters: Yes',
              'SEO optimized: Yes',
            ]}
            renderItem={(item) => <List.Item>{item}</List.Item>}
          />
        </Card>

        <Flex gap="small">
          <Button type="primary">Edit Category</Button>
          <Button danger>Delete</Button>
        </Flex>
      </Flex>
    </Flex>
  );
};
