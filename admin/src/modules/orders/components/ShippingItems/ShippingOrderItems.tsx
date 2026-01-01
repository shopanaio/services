import { getCoverColumn, getNameColumn } from '@components/table/columns';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { WeightPopover } from '@modules/orders/components/WeightPopover';
import { weightUniOptions } from '@src/defs/constants';
import { IOrderItem } from '@src/entity/Order/Order';
import { Table, Typography } from 'antd';

export const ShippingOrderItems = ({
  items,
  refetch,
}: {
  items: IOrderItem[];
  refetch: () => Promise<void>;
}) => {
  return (
    <Table
      locale={{
        emptyText: (
          <Flex justify="center" align="center" py="4">
            No items set
          </Flex>
        ),
      }}
      rowKey="id"
      pagination={false}
      style={{ width: '100%', marginTop: 'var(--x4)' }}
      columns={[
        getCoverColumn({ dataIndex: 'product.cover' }),
        getNameColumn(),
        {
          title: 'Quantity',
          dataIndex: 'qnt',
          key: 'qnt',
          render: (_, { quantity: q, fulfillmentQuantity: fq }: IOrderItem) => (
            <Box minW="100px">
              <Typography.Text data-testid="shipping-item-quantity">
                {fq} of {q}
              </Typography.Text>
            </Box>
          ),
        },
        {
          key: 'wight',
          dataIndex: 'weight',
          title: 'Unit weight',
          render: (_: any, { weight: w, ...record }: IOrderItem) => (
            <WeightPopover
              orderItem={{ ...record, weight: w }}
              onSave={refetch}
            >
              {w ? (
                <Typography.Text data-testid="unit-weight">
                  {w.weight}
                  {weightUniOptions[w.unit].label}
                </Typography.Text>
              ) : (
                <Typography.Text data-testid="unit-weight" type="secondary">
                  Not set
                </Typography.Text>
              )}
            </WeightPopover>
          ),
        },
      ]}
      dataSource={items}
    />
  );
};
