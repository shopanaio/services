import { memo } from 'react';
import { Avatar, Typography } from 'antd';
import { Flex } from '@components/utility/Flex';
import dayjs from 'dayjs';
import { Box } from '@components/utility/Box';
import { IRenderItemProps } from '@components/boards/Item/Item';
import { css } from '@emotion/react';
import { dollarsFromCents } from '@src/utils/price';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { StatusSummary } from '@modules/orders/components/StatusSummary';
import { fulfillmentStatuses, paymentStatuses } from '@modules/orders/defs';
import { MdPhone } from 'react-icons/md';
import { ICrmOrder } from '@src/entity/Order/Crm';

export const CrmTicketComponent = memo(
  ({ data, dragging, dragOverlay }: IRenderItemProps & { data: ICrmOrder }) => {
    if (!data) {
      return <Box>No data</Box>;
    }

    const {
      id: orderId,
      shippingAddress,
      payment,
      fulfillments,
      totalAmount,
      productsInfo,
      orderNumber,
      createdAt,
      customerFirstName: firstName,
      customerLastName: lastName,
      customerPhone: phone,
      tags,
    } = data;

    let color = tags?.[0]?.color || 'default';
    color = !color || color === 'default' ? 'gray' : color;

    const { address1, address2, city } = {
      ...shippingAddress,
    };

    return (
      <div
        data-testid="board-ticket-item"
        data-ticket-number={orderNumber}
        css={css`
          padding: var(--x1);
          box-sizing: border-box;
          width: 100%;
        `}
      >
        <div
          onClick={() => {
            $drawers.addDrawer({
              type: DrawerTypes.ORDER,
              entityId: orderId,
            });
          }}
          css={css`
            ${dragging && !dragOverlay
              ? css`
                  background-color: var(--color-gray-4);
                  border: 1px solid var(--color-border);
                `
              : css`
                  background-color: var(--color-${color}-1);
                  border: 1px solid var(--color-${color}-4);
                `}
            border-radius: var(--radius-base);
            box-shadow: 1px 1px 10px 0 rgba(0, 0, 0, 0.1);
            padding: var(--x3);
            max-height: 152px;
            min-height: 152px;
          `}
        >
          <Flex justify="space-between" align="center">
            <Flex gap="4">
              <Typography.Text data-testid="order-number" strong>
                #{orderNumber}
              </Typography.Text>
              <Typography.Text type="secondary">
                {createdAt ? dayjs(createdAt).format('MMMM DD') : '-'}
              </Typography.Text>
            </Flex>
            <Flex gap="1">
              <StatusSummary
                statuses={paymentStatuses}
                value={[
                  payment
                    ? payment.status
                    : // TODO: Show draft
                      fulfillmentStatuses.PENDING.value,
                ]}
              />
              <StatusSummary
                statuses={fulfillmentStatuses}
                value={
                  fulfillments.length
                    ? // Show draft
                      (fulfillments || []).map((it) => it.status)
                    : [fulfillmentStatuses.PENDING.value]
                }
              />
            </Flex>
          </Flex>
          <Flex justify="space-between" align="center" mt="3">
            <Typography.Text>
              {firstName} {lastName}
            </Typography.Text>
            <Typography.Text strong={!!phone}>
              <MdPhone />{' '}
              {phone || (
                <Typography.Text type="secondary">No phone</Typography.Text>
              )}
            </Typography.Text>
          </Flex>
          <Flex mt="3">
            {shippingAddress ? (
              <Typography.Text type="secondary" ellipsis>
                {city || 'No city'}, {address1}
                {address2 ? `, ${address2},` : ''}
              </Typography.Text>
            ) : (
              <Typography.Text type="secondary" ellipsis>
                No shipping address
              </Typography.Text>
            )}
          </Flex>
          <Flex mt="3" justify="space-between" align="center">
            <Flex gap="2" align="center">
              <Avatar.Group max={{ count: 3 }} size="small">
                {productsInfo?.map((item) => {
                  return (
                    <Avatar
                      key={item.id}
                      src={item?.cover?.url}
                      css={css`
                        &.ant-avatar {
                          outline: 1px solid var(--color-gray-5) !important;
                        }
                      `}
                    />
                  );
                })}
              </Avatar.Group>
              <Typography.Text>
                {productsInfo?.length} item
                {productsInfo.length === 1 ? '' : 's'}
              </Typography.Text>
            </Flex>
            <Typography.Text strong>
              ${dollarsFromCents(totalAmount) || '---'}
            </Typography.Text>
          </Flex>
        </div>
      </div>
    );
  },
);
