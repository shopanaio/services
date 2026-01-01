import { notify } from '@components/feedback/notification';
import { getCoverColumn, getNameColumn } from '@components/table/columns';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { CostPricePopover } from '@modules/orders/components/CostPricePopover';
import {
  FulfillmentActions,
  SplittingActions,
} from '@modules/orders/components/FulfillmentItems/Actions';
import { FulfillmentMenu } from '@modules/orders/components/FulfillmentItems/FulfillmentMenu';
import { TrackingInfo } from '@modules/orders/components/FulfillmentItems/TrackingInfo';
import { Price } from '@modules/orders/components/Price';
import { CreateShippingModal } from '@modules/orders/components/ShippingItems/CreateShippingModal';
import { FulfillmentStatusModal } from '@modules/orders/components/StatusConfirmation/FulfillmentStatusModal';
import { fulfillmentStatuses } from '@modules/orders/defs';
import {
  useSplitFulfillment,
  useUndoSplitFulfillment,
} from '@modules/orders/hooks/mutations';
import { IFulfillment } from '@src/entity/Order/FulfillmentItem';
import { IOrderItem } from '@src/entity/Order/Order';
import { FulfillmentStatusEnum } from '@src/graphql';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { useSelectedRows } from '@src/layouts/table/hooks/useSelectedRows';
import { mapEntryId } from '@src/utils/utils';
import { Button, Input, Space, Table, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MdAdd, MdRemove } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const ActiveFulfillment = ({
  parent,
  fulfillmentItem,
  refetch,
}: {
  parent: IFulfillment | null;
  fulfillmentItem: IFulfillment;
  refetch: () => Promise<void>;
}) => {
  const intl = useIntl();
  const {
    orderItems,
    id: fulfillmentId,
    shippingItem: trackingInfo = null,
    status,
    parentId,
  } = fulfillmentItem;
  const isParentPending = parent?.status === FulfillmentStatusEnum.Pending;
  const isPending = status === FulfillmentStatusEnum.Pending;
  const isFulfilled = status === FulfillmentStatusEnum.Fulfilled;

  console.log('parent', parent);
  const [splittingValue, setSplittingValue] = useState<
    | {
        [k in string]: number;
      }
    | null
  >(null);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);

  const [requestStatus, setRequestStatus] =
    useState<FulfillmentStatusEnum | null>(null);

  const onUpdateStatus = (status: FulfillmentStatusEnum) => {
    setRequestStatus(status);
  };

  const { clearSelectedRows, onChangeSelectedRows, selectedRows } =
    useSelectedRows();

  const [_, setLoading] = useState(false);
  const { splitFulfillment } = useSplitFulfillment();
  const { undoSplitFulfillment } = useUndoSplitFulfillment();

  const onCreateShipment = useCallback(() => setShippingModalOpen(true), []);
  const onStartSplit = useCallback(() => setSplittingValue({}), []);
  const onCancelSplit = useCallback(() => setSplittingValue(null), []);
  const canSplit = useMemo(() => {
    return (
      !parentId &&
      (orderItems.length > 1 || orderItems?.[0]?.fulfillmentQuantity > 1)
    );
  }, [parentId, orderItems]);

  useEffect(() => {
    if (splittingValue) {
      setSplittingValue((prev) => {
        return selectedRows.reduce(
          (acc, item) => ({
            ...acc,
            [item.id]: prev?.[item.id] ?? item.fulfillmentQuantity,
          }),
          {},
        );
      });
    }
  }, [selectedRows]);

  const onFinishSplitting = async () => {
    try {
      setLoading(true);
      await splitFulfillment({
        id: fulfillmentId,
        items: selectedRows.map((it) => ({
          orderItemId: it.id,
          quantity: splittingValue![it.id],
        })),
      });
      await refetch();
      notify.success(intl.formatMessage({ id: t('orders.fulfillment.split') }));
      onCancelSplit();
    } catch {
      notify.error(intl.formatMessage({ id: t('orders.fulfillment.splitFailed') }));
    } finally {
      setLoading(false);
    }
  };

  const onUndoSplitting = async () => {
    try {
      setLoading(true);
      await undoSplitFulfillment(fulfillmentId);
      await refetch();
      notify.success(intl.formatMessage({ id: t('orders.fulfillment.restored') }));
      onCancelSplit();
    } catch {
      notify.error(
        intl.formatMessage({ id: t('orders.fulfillment.restoreFailed') }),
      );
    } finally {
      setLoading(false);
    }
  };

  const splittingDisabled = () => {
    return !selectedRows.length || selectedRows.length === orderItems.length;
  };

  useEffect(() => {
    if (!splittingValue) {
      clearSelectedRows();
      return;
    }
  }, [splittingValue, clearSelectedRows]);

  const columns = [
    getCoverColumn({
      dataIndex: 'product.cover',
    }),
    getNameColumn({
      optionsPath: 'product.options',
    }),
    {
      title: intl.formatMessage({ id: t('orders.quantity') }),
      dataIndex: 'qnt',
      key: 'qnt',
      render: (_: any, record: IOrderItem) => {
        const { id, quantity: q, fulfillmentQuantity: fq } = record;
        const value = splittingValue?.[id];
        return value && fq > 1 ? (
          <Flex gap="2" align="center">
            <Space.Compact>
              <Button
                data-testid="order-item-split-decrement-button"
                icon={<MdRemove />}
                onClick={() => {
                  setSplittingValue((prev) => ({
                    ...prev,
                    [id]: Math.max(1, prev![id] - 1),
                  }));
                }}
              />
              <Input
                value={`${value} of ${fq}`}
                data-testid="order-item-split-quantity-field"
                style={{ width: 64 }}
                css={css`
                  text-align: center;
                `}
                placeholder={intl.formatMessage({ id: t('common.zero') })}
                readOnly
              />
              <Button
                data-testid="order-item-split-increment-button"
                icon={<MdAdd />}
                onClick={() => {
                  setSplittingValue((prev) => ({
                    ...prev,
                    [id]: Math.min(fq, prev![id] + 1),
                  }));
                }}
              />
            </Space.Compact>
          </Flex>
        ) : (
          <Typography.Text strong>
            {fq}{' '}
            <Typography.Text type="secondary">
              {intl.formatMessage({ id: t('orders.ofQnt') }, { q })}
            </Typography.Text>
          </Typography.Text>
        );
      },
    },
    {
      dataIndex: 'costPrice',
      key: 'costPrice',
      title: intl.formatMessage({ id: t('common.costPrice') }),
      render: (_: any, item: IOrderItem) => (
        <CostPricePopover refetch={refetch} orderItem={item}>
          {item.productCostPrice ? (
            <Price data={{ price: item.productCostPrice }} />
          ) : (
            <Typography.Text type="secondary">
              {intl.formatMessage({ id: t('table.notSet') })}
            </Typography.Text>
          )}
        </CostPricePopover>
      ),
    },
    {
      key: 'price',
      dataIndex: 'price',
      title: intl.formatMessage({ id: t('orders.unitPrice') }),
      render: (_: any, record: IOrderItem) => (
        <Price data={record} data-testid="order-item-unit-price" />
      ),
    },
    {
      key: 'total',
      dataIndex: 'total',
      title: intl.formatMessage({ id: t('common.total') }),
      render: (_: any, record: IOrderItem) => (
        <Price
          strong
          data={{ price: record.fulfillmentQuantity * record.price }}
          data-testid="order-item-total-price"
        />
      ),
    },
  ];

  return (
    <>
      <CreateShippingModal
        trackingInfo={trackingInfo || null}
        fulfillmentId={fulfillmentId}
        orderItems={orderItems}
        open={shippingModalOpen}
        refetch={refetch}
        onClose={() => {
          setShippingModalOpen(false);
        }}
      />
      <FulfillmentStatusModal
        onClose={() => setRequestStatus(null)}
        open={requestStatus !== null}
        id={fulfillmentId}
        refetch={refetch}
        status={requestStatus}
      />
      <DrawerPaper>
        <DrawerPaperHeader
          name="order-items"
          title={
            <Flex gap="2" align="center" w="100%">
              <Typography.Text
                strong
                css={css`
                  font-size: 16px;
                `}
              >
                Products
              </Typography.Text>
              <Tag
                data-testid="fulfillment-status"
                color={fulfillmentStatuses[status]?.color}
              >
                {fulfillmentStatuses[status]?.label}
              </Tag>
            </Flex>
          }
          extra={
            !isFulfilled &&
            !isPending &&
            !splittingValue && (
              <FulfillmentMenu
                isSplitting={false}
                onChangeStatus={onUpdateStatus}
                openShippingInfo={() => setShippingModalOpen(true)}
                status={status}
                trackingInfo={trackingInfo}
              />
            )
          }
        />
        <Table
          tableLayout="fixed"
          locale={{ emptyText: ' ' }}
          rowKey="id"
          pagination={false}
          rowSelection={
            splittingValue
              ? {
                  getCheckboxProps: () =>
                    ({ 'data-testid': 'table-row-checkbox' }) as any,
                  selectedRowKeys: selectedRows.map(mapEntryId),
                  columnWidth: 50,
                  onChange: (_, rows) => onChangeSelectedRows(rows),
                }
              : undefined
          }
          style={{ width: '100%', marginTop: 'var(--x4)' }}
          columns={columns}
          dataSource={orderItems}
        />
        {splittingValue && (
          <SplittingActions
            disabled={splittingDisabled()}
            onCancel={onCancelSplit}
            onFinish={onFinishSplitting}
          />
        )}
        {isPending && !splittingValue && (
          <FulfillmentActions
            onShip={onCreateShipment}
            onChangeStatus={onUpdateStatus}
            onSplit={canSplit ? onStartSplit : null}
            onUndoSplit={isParentPending ? onUndoSplitting : null}
          />
        )}
        {trackingInfo && <TrackingInfo trackingInfo={trackingInfo} />}
      </DrawerPaper>
    </>
  );
};
