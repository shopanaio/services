import { notify } from '@components/feedback/notification';
import { WeightInput } from '@components/forms/WeightInput';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { useUpdateOrderItem } from '@modules/orders/hooks/mutations';
import { IOrderItem } from '@src/entity/Order/Order';
import { WeightUnit } from '@src/graphql';
import { Button, Checkbox, Popover, Typography } from 'antd';
import { ReactNode, useEffect, useState } from 'react';
import { MdEdit } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

const defaultWeight = { weight: 0, unit: WeightUnit.Gr };

export const WeightPopover = ({
  orderItem,
  children,
  onSave,
}: {
  orderItem: IOrderItem;
  children: ReactNode;
  onSave: () => Promise<void>;
}) => {
  const [mouseOver, setMouseOver] = useState(false);
  const intl = useIntl();

  const { id, weight } = orderItem;
  const initialValue = weight || defaultWeight;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(initialValue.weight);
  const [unit, setUnit] = useState(initialValue.unit);
  const [shouldUpdateProduct, setShouldUpdateProduct] = useState(false);

  const { updateOrderItem } = useUpdateOrderItem();

  const onSubmit = async () => {
    setLoading(true);
    try {
      await updateOrderItem({
        id,
        weight: {
          weight: value,
          unit,
        },
      });
      await onSave();
      notify.success(intl.formatMessage({ id: t('orders.weight.updated') }));
      setOpen(false);
    } catch {
      notify.error(intl.formatMessage({ id: t('orders.weight.updateFailed') }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setValue(initialValue.weight);
      setUnit(initialValue.unit);
    }
  }, [initialValue, open]);

  return (
    <Popover
      placement="bottom"
      trigger="click"
      content={
        <Flex direction="column" gap="2">
          <Typography.Text strong>
            {intl.formatMessage({ id: t('common.weight') })}
          </Typography.Text>
          <WeightInput
            value={value}
            onChange={setValue}
            unit={unit}
            onChangeUnit={setUnit}
          />
          {/* <Flex as="label" gap="2" mt="1">
            <Checkbox
              checked={shouldUpdateProduct}
              onChange={({ target }) => setShouldUpdateProduct(target.checked)}
            />
            <Typography.Text>Update product</Typography.Text>
          </Flex> */}
          <Flex gap="3" mt="1">
            <Button
              block
              data-testid="weight-popover-cancel-button"
              onClick={() => {
                setOpen(false);
              }}
            >
              {intl.formatMessage({ id: t('common.cancel') })}
            </Button>
            <Button
              loading={loading}
              data-testid="weight-popover-save-button"
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
        data-testid="weight-popover-trigger"
        align="center"
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
