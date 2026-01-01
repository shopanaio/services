import {
  EmptyColumnText,
  actionsColumn,
  getColumnSortProps,
  getDateColumns,
  renderGallery,
  renderOptions,
} from '@components/table/columns';
import { useOrders } from '@modules/orders/hooks/useOrders';
import {
  IAddress,
  IOrder,
  IOrderPaymentSummary,
} from '@src/entity/Order/Order';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { TableLayout } from '@src/layouts/table/components/TableLayout';
import { ColumnsType } from 'antd/es/table';
import { Tag, Typography } from 'antd';
import { transformColumns } from '@src/utils/utils';
import { Entity } from '@src/defs/entities';
import { useDelete } from '@modules/shared/hooks/useDelete';
import { OrderStatusEnum } from '@src/graphql';
import {
  fulfillmentStatuses,
  orderColumns,
  orderStatuses,
  paymentStatuses,
} from '@modules/orders/defs';
import { Price } from '@modules/orders/components/Price';
import { StatusSummary } from '@modules/orders/components/StatusSummary';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { useCreateOrder } from '@modules/orders/hooks/mutations';
import { sanitizeEntries } from '@src/entity/utils';
import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import { IShippingMethod } from '@src/entity/Services/ShippingMethod';
import { IPaymentMethod } from '@src/entity/Services/PaymentMethod';
import { IOrderProductInfo } from '@src/entity/Order/ProductInfo';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

const Orders = () => {
  const { orders, loading, navigation, meta } = useOrders();

  const { selectedRows, onChangeSelectedRows } = navigation.selectedRowsProps;

  const { deleteEntry } = useDelete();
  const { createOrder } = useCreateOrder();

  const columns: ColumnsType<IOrder> = [
    {
      title: orderColumns.orderNumber.label,
      key: orderColumns.orderNumber.key,
      width: orderColumns.orderNumber.width,
      dataIndex: 'orderNumber',
      fixed: 'left' as const,
      ...getColumnSortProps('orderNumber', navigation.sortProps),
    },
    {
      dataIndex: 'productsInfo',
      title: orderColumns.items.label,
      key: orderColumns.items.key,
      width: orderColumns.items.width,
      render: (productsInfo: IOrderProductInfo[]) => {
        if (!productsInfo.length) {
          return (
            <EmptyColumnText>
              <FormattedMessage id={t('orders.table.noProducts')} />
            </EmptyColumnText>
          );
        }
        return renderGallery({
          files: sanitizeEntries<IMediaFile>(
            productsInfo.map(({ cover }) => {
              return cover || MediaFile.placeholder();
            }),
          ),
        });
      },
    },
    {
      title: orderColumns.status.label,
      key: orderColumns.status.key,
      dataIndex: 'status',
      width: 100,
      ...getColumnSortProps('orderStatus', navigation.sortProps),
      render: (status: OrderStatusEnum) => {
        if (!status) {
          return (
            <EmptyColumnText>
              <FormattedMessage id={t('common.internal.noStatus')} />
            </EmptyColumnText>
          );
        }

        return (
          <Tag
            style={{ minWidth: 50, textAlign: 'center' }}
            color={orderStatuses[status].color}
          >
            {orderStatuses[status].label}
          </Tag>
        );
      },
    },
    {
      dataIndex: 'customerDetails',
      title: orderColumns.customerEmail.label,
      key: orderColumns.customerEmail.key,
      width: orderColumns.customerEmail.width,
      render: (_: any, record: IOrder) => {
        if (!record.customerDetails?.email) {
          return <EmptyColumnText />;
        }

        return record.customerDetails?.email;
      },
      ...getColumnSortProps(
        orderColumns.customerEmail.key,
        navigation.sortProps,
      ),
    },
    {
      dataIndex: 'customerDetails',
      title: orderColumns.customerFirstName.label,
      key: orderColumns.customerFirstName.key,
      width: orderColumns.customerFirstName.width,
      render: (_: any, record: IOrder) => {
        if (!record.customerDetails?.firstName) {
          return <EmptyColumnText />;
        }

        return record.customerDetails?.firstName;
      },
      ...getColumnSortProps(
        orderColumns.customerFirstName.key,
        navigation.sortProps,
      ),
    },
    {
      dataIndex: 'customerDetails',
      title: orderColumns.customerLastName.label,
      key: orderColumns.customerLastName.key,
      width: orderColumns.customerLastName.width,
      render: (_: any, record: IOrder) => {
        if (!record.customerDetails?.lastName) {
          return <EmptyColumnText />;
        }
        return record.customerDetails?.lastName;
      },
      ...getColumnSortProps(
        orderColumns.customerLastName.key,
        navigation.sortProps,
      ),
    },
    {
      dataIndex: 'customerDetails',
      title: orderColumns.customerPhoneNumber.label,
      key: orderColumns.customerPhoneNumber.key,
      width: orderColumns.customerPhoneNumber.width,
      render: (_: any, record: IOrder) => {
        if (!record.customerDetails?.phone) {
          return <EmptyColumnText />;
        }

        return record.customerDetails?.phone;
      },
      ...getColumnSortProps(
        orderColumns.customerPhoneNumber.key,
        navigation.sortProps,
      ),
    },
    {
      dataIndex: 'fulfillmentsStatus',
      title: orderColumns.fulfillmentStatus.label,
      key: orderColumns.fulfillmentStatus.key,
      width: orderColumns.fulfillmentStatus.width,
      render: (_: any, record: IOrder) => {
        return (
          <StatusSummary
            statuses={fulfillmentStatuses}
            value={
              record.fulfillments?.length
                ? record.fulfillments.map((it) => it.status)
                : [fulfillmentStatuses.PENDING.value]
            }
          />
        );
      },
    },
    {
      dataIndex: 'paymentStatus',
      title: orderColumns.paymentStatus.label,
      key: orderColumns.paymentStatus.key,
      width: orderColumns.paymentStatus.width,
      render: (_: any, record: IOrder) => {
        return (
          <StatusSummary
            statuses={paymentStatuses}
            value={
              record.paymentItem
                ? [record.paymentItem.status]
                : [paymentStatuses.PENDING.value]
            }
          />
        );
      },
    },
    {
      dataIndex: 'totalDiscount',
      title: orderColumns.totalDiscount.label,
      key: orderColumns.totalDiscount.key,
      width: orderColumns.totalDiscount.width,
      ...getColumnSortProps(
        orderColumns.totalDiscount.key,
        navigation.sortProps,
      ),
      render: (discount: number | null) => (
        <Typography.Text>
          {typeof discount === 'number' ? (
            <Price data={{ price: discount }} />
          ) : (
            <FormattedMessage id={t('orders.table.noDiscount')} />
          )}
        </Typography.Text>
      ),
    },
    {
      dataIndex: 'paymentSummary',
      title: orderColumns.totalPrice.label,
      key: orderColumns.totalPrice.key,
      width: orderColumns.totalPrice.width,
      ...getColumnSortProps('totalAmount', navigation.sortProps),
      render: (paymentSummary: IOrderPaymentSummary) => (
        <Price data={{ price: paymentSummary.totalAmount }} />
      ),
    },
    {
      dataIndex: 'shippingAddress',
      title: orderColumns.shippingAddress.label,
      key: orderColumns.shippingAddress.key,
      width: orderColumns.shippingAddress.width,
      render: (shippingAddress: IAddress) => {
        if (!shippingAddress?.address1) {
          return <EmptyColumnText />;
        }

        return shippingAddress.address1;
      },
    },
    {
      dataIndex: 'billingAddress',
      title: orderColumns.billingAddress.label,
      key: orderColumns.billingAddress.key,
      width: orderColumns.billingAddress.width,
      render: (billingAddress: IAddress) => {
        if (!billingAddress?.address1) {
          return <EmptyColumnText />;
        }

        return billingAddress.address1;
      },
    },
    {
      dataIndex: 'shippingMethod',
      title: orderColumns.shippingMethod.label,
      key: orderColumns.shippingMethod.key,
      width: orderColumns.shippingMethod.width,
      render: (shippingMethod: IShippingMethod) => {
        if (!shippingMethod) {
          return <EmptyColumnText />;
        }

        return (
          shippingMethod.name || <FormattedMessage id={t('common.internal.noName')} />
        );
      },
    },
    {
      dataIndex: 'paymentMethod',
      title: orderColumns.paymentMethod.label,
      key: orderColumns.paymentMethod.key,
      width: orderColumns.paymentMethod.width,
      render: (paymentMethod: IPaymentMethod) => {
        if (!paymentMethod) {
          return <EmptyColumnText />;
        }

        return (
          paymentMethod.name || <FormattedMessage id={t('common.internal.noName')} />
        );
      },
    },
    {
      dataIndex: 'tags',
      key: orderColumns.tags.key,
      title: orderColumns.tags.label,
      width: orderColumns.tags.width,
      render: (_: any, record: IOrder) => {
        return renderOptions({
          options: record?.tags,
        });
      },
    },

    ...getDateColumns({
      sortProps: navigation.sortProps,
    }),
    {
      ...actionsColumn({
        onDelete: ({ id }) => {
          deleteEntry(id, Entity.Order);
        },
        settings: navigation.columnsProps,
        onEdit: ({ id }: IOrder) => {
          $drawers.addDrawer({
            type: DrawerTypes.ORDER,
            entityId: id,
          });
        },
      }),
      fixed: 'right' as const,
    },
  ];

  const activeColumns = transformColumns(
    navigation.columnsProps.value,
    columns,
  );
  const scrollX = activeColumns.reduce((acc, it) => {
    const option = orderColumns?.[it.key as keyof typeof orderColumns];
    if (!option) {
      return acc;
    }

    return option.isFixed ? acc : acc + (option?.width || 0) * 1.5;
  }, 0);

  return (
    <TableLayout
      paginationProps={{
        onChangePage: navigation.paginationProps.setPage,
        onChangePageSize: navigation.paginationProps.setPageSize,
        page: meta.page,
        pageSize: meta.pageSize,
        total: meta.total,
      }}
      tableProps={{
        name: 'orders',
        layout: 'fixed',
        scroll: {
          x: scrollX,
        },
        sticky: true,
        loading,
        selectedRows,
        onChangeSelectedRows,
        columns: activeColumns,
        data: orders,
        onRow: (record: any) => {
          $drawers.addDrawer({
            type: DrawerTypes.ORDER,
            entityId: record.id,
          });
        },
      }}
      navigationProps={{
        ...navigation,
        actionsProps: {
          canSetStatus: false,
          entityType: Entity.Order,
          refetchQueries: getRefetchQueries(),
        },
      }}
      headerProps={{
        title: <FormattedMessage id={t('orders.title')} />,
        count: meta.total,
        create: () => {
          createOrder().then((id) => {
            if (id) {
              $drawers.addDrawer({
                entityId: id,
                type: DrawerTypes.ORDER,
              });
            }
          });
        },
      }}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default Orders;
