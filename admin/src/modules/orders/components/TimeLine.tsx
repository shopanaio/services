import { notify } from '@components/feedback/notification';
import { Paper } from '@components/paper/Paper';
import { getIconProps } from '@components/styles';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { UserAvatar } from '@modules/account/components/Avatar';
import { fulfillmentStatusMessageIds } from '@modules/orders/components/StatusConfirmation/FulfillmentStatusModal';
import { orderStatusMessageIds } from '@modules/orders/components/StatusConfirmation/OrderStatusModal';
import { paymentStatusMessageIds } from '@modules/orders/components/StatusConfirmation/PaymentStatusModal';
import { useAddOrderComment } from '@modules/orders/hooks/mutations';
import { IOrder } from '@src/entity/Order/Order';
import { IOrderEvent } from '@src/entity/Order/OrderEvent';
import {
  FulfillmentStatusEnum,
  OrderEventTypeEnum,
  OrderStatusEnum,
  PaymentStatusEnum,
} from '@src/graphql';
import { formatDate } from '@src/utils/date';
import { Button, Input, Timeline, Typography } from 'antd';
import { capitalize } from 'lodash';
import { useState } from 'react';
import { MdSend } from 'react-icons/md';
import { useIntl, FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

const EventLog = ({
  event,
  children,
  title,
}: {
  event: IOrderEvent;
  children?: React.ReactNode;
  title: string;
}) => {
  return (
    <Box w="100%">
      <Flex justify="space-between">
        <Flex gap="2" align="center">
          <Typography.Text strong data-testid="event-title">
            {title}
          </Typography.Text>
          {event.createdBy.__typename === 'User' && (
            <Typography.Text type="secondary" code data-testid="event-author">
              {event.createdBy.firstName} {event.createdBy.lastName}
            </Typography.Text>
          )}
          {event.createdBy.__typename === 'ApiKey' && (
            <Typography.Text type="secondary" code data-testid="event-author">
              API Key: {event.createdBy.name}
            </Typography.Text>
          )}
        </Flex>
        {event.createdAt && (
          <Typography.Text type="secondary" data-testid="event-date">
            {formatDate(event.createdAt)}
          </Typography.Text>
        )}
      </Flex>
      {children && <Flex mt="4">{children}</Flex>}
    </Box>
  );
};

const EventComment = ({ event }: { event: IOrderEvent }) => {
  return event.eventData.comment ? (
    <Typography.Text
      data-testid="event-comment"
      css={css`
        font-style: italic;
        white-space: pre-wrap;
        word-break: break-word;
      `}
    >
      {event.eventData.comment}
    </Typography.Text>
  ) : (
    <Typography.Text type="secondary">
      <FormattedMessage id={t('orders.timeline.noComment')} />
    </Typography.Text>
  );
};

export const renderLog = {
  ['default']: (event: IOrderEvent) => {
    return (
      <EventLog
        event={event}
        title={capitalize(event.eventType.replaceAll('_', ' '))}
      />
    );
  },
  [OrderEventTypeEnum.CommentCreated]: (event: IOrderEvent) => {
    return (
      <EventLog
        event={event}
        title={
          // eslint-disable-next-line react/jsx-key
          <FormattedMessage id={t('orders.timeline.commentAdded')} />
        }
      >
        <EventComment event={event} />
      </EventLog>
    );
  },
  [OrderEventTypeEnum.OrderNoteUpdated]: (event: IOrderEvent) => {
    return (
      <EventLog
        event={event}
        title={
          // eslint-disable-next-line react/jsx-key
          <FormattedMessage id={t('orders.timeline.quickNoteUpdated')} />
        }
      >
        <EventComment event={event} />
      </EventLog>
    );
  },
  [OrderEventTypeEnum.OrderCreated]: (event: IOrderEvent) => (
    <EventLog
      event={event}
      title={
        // eslint-disable-next-line react/jsx-key
        <FormattedMessage id={t('orders.timeline.orderCreated')} />
      }
    />
  ),
  [OrderEventTypeEnum.OrderStatusUpdated]: (event: IOrderEvent) => (
    <EventLog
      event={event}
      title={
        // eslint-disable-next-line react/jsx-key
        <FormattedMessage
          id={
            orderStatusMessageIds.success[
              event.eventData.status as OrderStatusEnum
            ] || t('orders.timeline.orderStatusUpdated')
          }
        />
      }
    >
      <EventComment event={event} />
    </EventLog>
  ),
  [OrderEventTypeEnum.FulfillmentStatusUpdated]: (event: IOrderEvent) => (
    <EventLog
      event={event}
      title={
        // eslint-disable-next-line react/jsx-key
        <FormattedMessage
          id={
            fulfillmentStatusMessageIds.success[
              event.eventData.status as FulfillmentStatusEnum
            ] || t('orders.timeline.fulfillmentStatusUpdated')
          }
        />
      }
    >
      <EventComment event={event} />
    </EventLog>
  ),
  [OrderEventTypeEnum.PaymentStatusUpdated]: (event: IOrderEvent) => (
    <EventLog
      event={event}
      title={
        // eslint-disable-next-line react/jsx-key
        <FormattedMessage
          id={
            paymentStatusMessageIds.success[
              event.eventData.status as PaymentStatusEnum
            ] || t('orders.timeline.paymentStatusUpdated')
          }
        />
      }
    >
      <EventComment event={event} />
    </EventLog>
  ),
};

export const TimeLine = ({
  order,
  refetch,
}: {
  order: IOrder;
  refetch: () => Promise<void>;
}) => {
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState('');
  const { addComment } = useAddOrderComment();
  const intl = useIntl();

  const postComment = async () => {
    try {
      setLoading(true);
      await addComment({ id: order.id, comment: value });
      await refetch();
      setValue('');
      notify.success(intl.formatMessage({ id: t('orders.timeline.commentAdded') }));
    } catch {
      notify.error(
        intl.formatMessage({ id: t('orders.timeline.addCommentFailed') }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex key="comments" py="10" direction="column">
      <Flex ml="4">
        <Typography.Title level={5}>
          <FormattedMessage id={t('orders.timeline.title')} />
        </Typography.Title>
      </Flex>
      <Flex mt="4">
        <Paper
          css={css`
            padding: var(--x4);
          `}
        >
          <Flex align="flex-end">
            <Flex gap="2" grow="1">
              <UserAvatar size="large" shape="square" />
              <Input.TextArea
                data-testid="add-comment-field"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                variant="borderless"
                placeholder={intl.formatMessage({ id: t('orders.timeline.leaveComment') })}
                autoSize={{ minRows: 1, maxRows: 10 }}
              />
            </Flex>
            <Flex justify="flex-end">
              <Button
                data-testid="add-comment-submit-button"
                loading={loading}
                disabled={!value.trim()}
                onClick={postComment}
                type="primary"
                size="large"
                icon={<MdSend {...getIconProps(19)} />}
              />
            </Flex>
          </Flex>
        </Paper>
      </Flex>
      <Flex pl="18" pt="6">
        <Timeline style={{ width: '100%' }}>
          {order.events.map((event) => {
            // @ts-expect-error ...
            const render = renderLog[event.eventType] || renderLog['default'];
            if (!render) {
              return null;
            }

            return (
              <Timeline.Item
                key={event.id}
                css={css`
                  width: 100%;
                `}
              >
                {render(event)}
              </Timeline.Item>
            );
          })}
        </Timeline>
      </Flex>
    </Flex>
  );
};
