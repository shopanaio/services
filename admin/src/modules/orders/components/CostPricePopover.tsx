import { notify } from '@components/feedback/notification';
import { CurrencyInput } from '@components/forms/CurrencyInput';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { useUpdateOrderItem } from '@modules/orders/hooks/mutations';
import { IOrderItem } from '@src/entity/Order/Order';
import { Button, Popover, Typography } from 'antd';
import { ReactNode, useEffect, useState } from 'react';
import { MdEdit } from 'react-icons/md';

export const CostPricePopover = ({
  orderItem,
  children,
  refetch,
}: {
  orderItem: IOrderItem;
  children: ReactNode;
  refetch: () => Promise<void>;
}) => {
  const [mouseOver, setMouseOver] = useState(false);

  const { id, productCostPrice: initialValue } = orderItem;
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialValue || 0);

  const { updateOrderItem } = useUpdateOrderItem();

  const onSubmit = async () => {
    try {
      setLoading(true);
      await updateOrderItem({
        id,
        productCostPrice: value,
      });
      await refetch();
      setOpen(false);
      notify.success('Cost price updated.');
    } catch {
      notify.error('Failed to update cost price');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setValue(initialValue || 0);
  }, [initialValue, open]);

  return (
    <Popover
      placement="bottom"
      trigger="click"
      content={
        <Flex direction="column" gap="2">
          <Typography.Text strong>Cost price</Typography.Text>
          <CurrencyInput
            data-testid="order-item-cost-price-field"
            value={value}
            style={{ width: '200px' }}
            placeholder="0"
            onChange={(next) => {
              if (typeof next !== 'number') {
                return;
              }

              setValue(next);
            }}
          />

          <Flex gap="3" mt="1">
            <Button
              block
              data-testid="order-item-cost-price-cancel-button"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              loading={loading}
              data-testid="order-item-cost-price-save-button"
              type="primary"
              block
              onClick={onSubmit}
            >
              Save
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
        gap="1"
        css={css`
          cursor: pointer;
        `}
        minW="120px"
        align="center"
        role="button"
        data-testid="order-item-edit-cost-price-button"
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
