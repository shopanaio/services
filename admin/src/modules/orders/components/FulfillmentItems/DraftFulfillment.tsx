import { notify } from '@components/feedback/notification';
import { getIconProps } from '@components/styles';
import { getCoverColumn, getNameColumn } from '@components/table/columns';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { Price } from '@modules/orders/components/Price';
import { QntPopover } from '@modules/orders/components/QntPopover';
import {
  useCreateOrderItem,
  useDeleteOrderItem,
} from '@modules/orders/hooks/mutations';
import { BrowseVariantsButton } from '@modules/products/components/BrowseVariantsButton';
import { IOrder, IOrderItem } from '@src/entity/Order/Order';
import { IProductVariant } from '@src/entity/Product/Variant';
import { DimensionUnit, WeightUnit } from '@src/graphql';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { App, Button, Dropdown, Table, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

import { MdAdd, MdMoreHoriz } from 'react-icons/md';

export const DraftFulfillment = ({
  order,
  refetch,
}: {
  order: IOrder;
  refetch: () => Promise<void>;
}) => {
  const { orderItems, id } = order;
  const { modal } = App.useApp();
  const { formatMessage } = useIntl();

  const [loading, setLoading] = useState(false);

  const { createOrderItem } = useCreateOrderItem();
  const { deleteOrderItem } = useDeleteOrderItem();

  const onAddProducts = async (products: IProductVariant[]) => {
    const newProducts = products.filter((product) => {
      return !orderItems.some((it) => it.product?.variantId === product.id);
    });
    if (!newProducts.length) {
      notify.error(formatMessage({ id: t('orders.items.noNewProducts') }));
      return;
    }
    setLoading(true);
    for (const product of newProducts) {
      try {
        await createOrderItem({
          orderId: id,
          productId: product.id,
          quantity: 1,
        });
        notify.success(formatMessage({ id: t('orders.items.added') }));
      } catch (error) {
        notify.error(formatMessage({ id: t('orders.items.addFailed') }));
      }
    }
    await refetch();
    setLoading(false);
  };

  const onDeleteOrderItem = async (id: ID) => {
    const confirmed = await modal.confirm({
      icon: null,
      title: formatMessage({ id: t('orders.items.deleteConfirm.title') }),
      content: formatMessage({
        id: t('orders.items.deleteConfirm.content'),
      }),
      okText: formatMessage({ id: t('common.yes') }),
      cancelText: formatMessage({ id: t('common.no') }),
    });
    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      await deleteOrderItem(id);
      await refetch();
      notify.success(formatMessage({ id: t('orders.items.deleted') }));
    } catch {
      notify.error(formatMessage({ id: t('orders.items.deleteFailed') }));
    } finally {
      setLoading(false);
    }
  };

  // Build list of already selected variants to pass to BrowseVariantsButton
  const selectedVariants: IProductVariant[] = orderItems
    .map((it) => {
      const info = it.product;
      if (!info?.variantId) {
        return null;
      }

      // Minimal variant object sufficient for BrowseVariants selection logic
      // @ts-expect-error
      return {
        id: info.variantId,
        title: info.title,
        cover: info.cover,
        options: info.options || [],
        price: info.price ?? 0,
        // Fill required fields with safe defaults
        categories: [],
        container: null,
        containerId: '',
        costPrice: 0,
        createdAt: new Date(0),
        gallery: [],
        inListing: true,
        isVariant: true,
        oldPrice: 0,
        qnt: 0,
        sku: info.sku || '',
        slug: '',
        stockStatus: '',
        updatedAt: new Date(0),
        weight: null,
        weightUnit: WeightUnit.Gr,
        variantSortIndex: 0,
        height: 0,
        length: 0,
        width: 0,
        dimensionUnit: DimensionUnit.Mm,
        __typename: 'Variant',
      } as IProductVariant;
    })
    .filter(Boolean) as IProductVariant[];

  const columns = [
    getNameColumn({
      titlePath: 'product.title',
      coverPath: 'product.cover',
      optionsPath: 'product.options',
    }),
    {
      title: 'Quantity',
      dataIndex: 'qnt',
      key: 'qnt',
      render: (_: any, { quantity: qnt, ...record }: IOrderItem) => (
        <QntPopover refetch={refetch} orderItem={{ ...record, quantity: qnt }}>
          <Typography.Text strong>{qnt}</Typography.Text>
        </QntPopover>
      ),
    },
    {
      key: 'price',
      dataIndex: 'price',
      title: formatMessage({ id: t('orders.unitPrice') }),
      render: (_: any, record: IOrderItem) => (
        <Price data={record} data-testid="order-item-unit-price" />
      ),
    },
    {
      key: 'total',
      dataIndex: 'total',
      title: formatMessage({ id: t('common.total') }),
      render: (_: any, record: IOrderItem) => (
        <Price
          strong
          data={{ price: record.totalAmount }}
          data-testid="order-item-total-price"
        />
      ),
    },
    {
      width: 50,
      key: 'actions',
      align: 'right' as const,
      render: (_: any, entry: IOrderItem) => {
        return (
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                {
                  key: 'delete',
                  label: formatMessage({
                    id: t('orders.items.actions.delete'),
                  }),
                  onClick: () => onDeleteOrderItem(entry.id as ID),
                  // @ts-expect-error
                  'data-testid': 'order-item-delete-item',
                },
              ],
            }}
          >
            <Button
              loading={loading}
              type="text"
              icon={<MdMoreHoriz />}
              data-testid="order-item-actions-button"
            />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        name="order-items"
        title={formatMessage({ id: t('common.products') })}
        extra={
          <BrowseVariantsButton
            value={selectedVariants}
            multiple
            onChange={onAddProducts}
            inListing={false}
            buttonProps={{
              loading,
              icon: <MdAdd {...getIconProps(20)} />,
            }}
          />
        }
      />
      <Table
        tableLayout="fixed"
        locale={{ emptyText: ' ' }}
        rowKey="id"
        pagination={false}
        style={{ width: '100%', marginTop: 'var(--x4)' }}
        columns={columns}
        dataSource={orderItems}
      />
      {!orderItems?.length && (
        <Flex
          justify="center"
          align="center"
          data-testid="no-products-message"
          css={css`
            padding: var(--x1) 0 var(--x2);
          `}
        >
          <Typography.Text type="secondary">
            {formatMessage({ id: t('orders.items.empty') })}
          </Typography.Text>
        </Flex>
      )}
    </DrawerPaper>
  );
};
