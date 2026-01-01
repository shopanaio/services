import { notify } from '@components/feedback/notification';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { useUpdateOrderItem } from '@modules/orders/hooks/mutations';
import { IOrderItem } from '@src/entity/Order/Order';
import { Button, Input, Popover, Space, Typography } from 'antd';
import { ReactNode, useEffect, useState } from 'react';
import { MdEdit, MdNavigateBefore, MdNavigateNext } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const QntPopover = ({
  orderItem,
  children,
  readOnly,
  refetch,
}: {
  orderItem: IOrderItem;
  children: ReactNode;
  readOnly?: boolean;
  refetch: () => Promise<void>;
}) => {
  const [mouseOver, setMouseOver] = useState(false);
  const intl = useIntl();

  const { id, quantity: initialValue } = orderItem;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(initialValue);
  const { updateOrderItem } = useUpdateOrderItem();

  const onSubmit = async () => {
    try {
      setLoading(true);
      await updateOrderItem({
        id,
        quantity: value,
      });
      await refetch();
      setOpen(false);
      notify.success(intl.formatMessage({ id: t('orders.quantityUpdated') }));
    } catch {
      notify.error(intl.formatMessage({ id: t('orders.quantityUpdateFailed') }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setValue(initialValue || 1);
  }, [initialValue, open]);

  if (readOnly) {
    return (
      <Flex
        data-testid="order-item-qty"
        css={css`
          cursor: default;
        `}
        gap="1"
        minW="120px"
        align="center"
      >
        {children}
      </Flex>
    );
  }

  return (
    <Popover
      placement="bottom"
      trigger="click"
      content={
        <Flex
          direction="column"
          gap="2"
          data-testid="order-item-quantity-popover"
        >
          <Typography.Text strong>
            {intl.formatMessage({ id: t('orders.quantity') })}
          </Typography.Text>
          <Space.Compact>
            <Button
              data-testid="order-item-decrement-button"
              icon={<MdNavigateBefore />}
              onClick={() => {
                setValue((prev) => Math.max(1, prev - 1));
              }}
            />
            <Input
              min={1}
              data-testid="order-item-quantity-field"
              value={value}
              style={{ width: 100 }}
              placeholder={intl.formatMessage({ id: t('common.zero') })}
              readOnly
            />
            <Button
              data-testid="order-item-increment-button"
              icon={<MdNavigateNext />}
              onClick={() => {
                setValue((prev) => prev + 1);
              }}
            />
          </Space.Compact>
          <Flex gap="3" mt="1">
            <Button
              data-testid="order-item-qnt-cancel-button"
              onClick={() => {
                setOpen(false);
              }}
            >
              {intl.formatMessage({ id: t('common.cancel') })}
            </Button>
            <Button
              loading={loading}
              data-testid="order-item-qnt-save-button"
              type="primary"
              block
              onClick={onSubmit}
            >
              {intl.formatMessage({ id: t('common.save') })}
            </Button>
          </Flex>
        </Flex>
      }
      onOpenChange={(visible) => {
        setOpen(visible);
      }}
      open={open}
    >
      <Flex
        css={css`
          cursor: pointer;
        `}
        gap="1"
        role="button"
        minW="120px"
        align="center"
        data-testid="order-item-edit-qty-button"
        onMouseOver={() => {
          setMouseOver(true);
        }}
        onMouseLeave={() => {
          setMouseOver(false);
        }}
      >
        {children}
        <MdEdit style={{ opacity: mouseOver || open ? 1 : 0 }} />
      </Flex>
    </Popover>
  );
};
