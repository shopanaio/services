'use client';

import { Typography, Flex, Descriptions, Tag, Image, Divider, Button } from 'antd';
import { useDrawerContext, useDrawer } from '@/layouts/drawers';
import type { ProductDrawerPayload } from './types';
// Import category types for type-safe useDrawer('category')
import '../../categories/drawers/types';

const mockProductsMap: Record<
  string,
  {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    status: 'active' | 'draft' | 'archived';
    category: string;
    image: string;
    description: string;
  }
> = {
  '1': {
    id: '1',
    name: 'iPhone 15 Pro Max',
    sku: 'APL-IPH15PM-256',
    price: 1199,
    stock: 45,
    status: 'active',
    category: 'Electronics',
    image: 'https://picsum.photos/seed/1/200/200',
    description: 'The most powerful iPhone ever with A17 Pro chip.',
  },
  '2': {
    id: '2',
    name: 'Samsung Galaxy S24 Ultra',
    sku: 'SAM-GS24U-512',
    price: 1299,
    stock: 32,
    status: 'active',
    category: 'Electronics',
    image: 'https://picsum.photos/seed/2/200/200',
    description: 'Ultimate smartphone with AI features.',
  },
  '3': {
    id: '3',
    name: 'MacBook Pro 16',
    sku: 'APL-MBP16-M3',
    price: 2499,
    stock: 18,
    status: 'active',
    category: 'Computers',
    image: 'https://picsum.photos/seed/3/200/200',
    description: 'Pro laptop with M3 chip for professionals.',
  },
  '4': {
    id: '4',
    name: 'Sony WH-1000XM5',
    sku: 'SNY-WH1000XM5',
    price: 399,
    stock: 0,
    status: 'archived',
    category: 'Audio',
    image: 'https://picsum.photos/seed/4/200/200',
    description: 'Industry-leading noise cancellation headphones.',
  },
  '5': {
    id: '5',
    name: 'iPad Air M2',
    sku: 'APL-IPADAIR-M2',
    price: 799,
    stock: 56,
    status: 'active',
    category: 'Electronics',
    image: 'https://picsum.photos/seed/5/200/200',
    description: 'Powerful and colorful tablet with M2 chip.',
  },
};

const statusColors = {
  active: 'green',
  draft: 'orange',
  archived: 'default',
} as const;

/**
 * Product drawer component
 * Uses the new typed drawer context API
 */
export const ProductDrawer = () => {
  // Typed context access - payload is ProductDrawerPayload
  const { payload, close, setDirty } = useDrawerContext<ProductDrawerPayload>();

  // Type-safe drawer opener for category
  const openCategory = useDrawer('category');

  const product = mockProductsMap[String(payload.entityId)];

  const handleOpenCategory = () => {
    if (product?.category) {
      openCategory({ entityId: product.category });
    }
  };

  if (!product) {
    return (
      <Flex
        vertical
        align="center"
        justify="center"
        style={{ height: '100%', padding: 24 }}
      >
        <Typography.Text type="secondary">Product not found</Typography.Text>
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
        <Flex align="center" gap="middle">
          <Image
            src={product.image}
            alt={product.name}
            width={48}
            height={48}
            style={{ borderRadius: 8 }}
            preview={false}
          />
          <Flex vertical>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {product.name}
            </Typography.Title>
            <Typography.Text type="secondary">{product.sku}</Typography.Text>
          </Flex>
        </Flex>
        <Flex gap="small">
          <Tag color={statusColors[product.status]}>
            {product.status.toUpperCase()}
          </Tag>
          <Button onClick={close}>Close</Button>
        </Flex>
      </Flex>

      <Flex vertical style={{ padding: 24, flex: 1, overflow: 'auto' }}>
        <Typography.Title level={5}>Product Details</Typography.Title>

        <Descriptions column={2} bordered>
          <Descriptions.Item label="Name">{product.name}</Descriptions.Item>
          <Descriptions.Item label="SKU">{product.sku}</Descriptions.Item>
          <Descriptions.Item label="Price">${product.price}</Descriptions.Item>
          <Descriptions.Item label="Stock">
            <Typography.Text type={product.stock === 0 ? 'danger' : undefined}>
              {product.stock} units
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Category">
            <Button type="link" style={{ padding: 0 }} onClick={handleOpenCategory}>
              {product.category}
            </Button>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={statusColors[product.status]}>{product.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            {product.description}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Typography.Title level={5}>Actions</Typography.Title>
        <Flex gap="small">
          <Button type="primary">Edit Product</Button>
          <Button>Duplicate</Button>
          <Button danger>Delete</Button>
        </Flex>
      </Flex>
    </Flex>
  );
};
