import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { OrderStatusConfirmationModal } from '@modules/orders/components/StatusConfirmation/OrderStatusModal';
import { orderStatuses } from '@modules/orders/defs';
import { IOrder } from '@src/entity/Order/Order';
import {
  FulfillmentStatusEnum,
  OrderStatusEnum,
  PaymentStatusEnum,
} from '@src/graphql';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { formatDate } from '@src/utils/date';
import { Button, Dropdown, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { MdMoreHoriz } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const OrderStatusAndInfo = ({
  order,
  refetch,
}: {
  order: IOrder;
  refetch: () => Promise<void>;
}) => {
  const [requestStatus, setRequestStatus] = useState<OrderStatusEnum | null>(
    null,
  );
  const intl = useIntl();

  const onUpdateStatus = (status: OrderStatusEnum) => {
    setRequestStatus(status);
  };

  let isConsideredToBeCancelled = false;
  if (
    order.paymentItem?.status === PaymentStatusEnum.Cancelled &&
    order.fulfillments.length &&
    order.fulfillments.every(
      (it) => it.status === FulfillmentStatusEnum.Cancelled,
    )
  ) {
    isConsideredToBeCancelled = true;
  }

  const canConfirmOrder = !!order.orderItems.length;

  return (
    <>
      <OrderStatusConfirmationModal
        order={order}
        open={requestStatus !== null}
        status={requestStatus}
        onClose={() => setRequestStatus(null)}
        refetch={refetch}
      />
      <DrawerPaper>
        <DrawerPaperHeader
          title={intl.formatMessage({ id: t('orders.info.title') })}
          name="entry-info"
        />
        <Flex grow="1" justify="space-between">
          {intl.formatMessage({ id: t('common.status') })}
          <Tag
            data-testid="order-status"
            color={orderStatuses[order.status]?.color}
            css={css`
              margin: 0px;
            `}
          >
            {orderStatuses[order.status]?.label}
          </Tag>
        </Flex>
        <Flex justify="space-between" mt="2">
          <Label>{intl.formatMessage({ id: t('orders.info.created') })}: </Label>
          <Typography.Text>{formatDate(order.createdAt)}</Typography.Text>
        </Flex>
        <Flex justify="space-between" mt="1">
          <Label>{intl.formatMessage({ id: t('orders.info.lastUpdate') })}: </Label>
          <Typography.Text>{formatDate(order.updatedAt)}</Typography.Text>
        </Flex>
        {order.status === OrderStatusEnum.Draft && (
          <Box mt="4">
            <Space.Compact block>
              <Button
                disabled={!canConfirmOrder}
                block
                onClick={() => onUpdateStatus(OrderStatusEnum.Active)}
                data-testid="confirm-order-button"
              >
                {intl.formatMessage({ id: t('orders.actions.confirm') })}
              </Button>
              <Dropdown
                trigger={['click']}
                placement="bottomRight"
                menu={{
                  items: [
                    {
                      key: 'cancel',
                      label: intl.formatMessage({ id: t('orders.actions.cancel') }),
                      onClick: () => onUpdateStatus(OrderStatusEnum.Cancelled),
                      // @ts-expect-error
                      'data-testid': 'cancel-order-item',
                    },
                  ],
                }}
              >
                <Button
                  icon={<MdMoreHoriz />}
                  data-testid="order-actions-menu"
                />
              </Dropdown>
            </Space.Compact>
          </Box>
        )}
        {order.status === OrderStatusEnum.Active && (
          <Box mt="4">
            {isConsideredToBeCancelled ? (
              <Button
                block
                onClick={() => onUpdateStatus(OrderStatusEnum.Cancelled)}
                type="primary"
                data-testid="cancel-order-button"
                danger
              >
                {intl.formatMessage({ id: t('orders.actions.cancel') })}
              </Button>
            ) : (
              <Button
                block
                onClick={() => onUpdateStatus(OrderStatusEnum.Completed)}
                type="primary"
                data-testid="complete-order-button"
              >
                {intl.formatMessage({ id: t('orders.actions.complete') })}
              </Button>
            )}
          </Box>
        )}
      </DrawerPaper>
    </>
  );
};
