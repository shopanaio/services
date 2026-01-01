import { css } from '@emotion/react';
import { Divider, Input, Modal, Typography } from 'antd';
import { ShippingOrderItems } from '@modules/orders/components/ShippingItems/ShippingOrderItems';
import { Flex } from '@components/utility/Flex';
import { Box } from '@components/utility/Box';
import { Label } from '@components/forms/Label';
import { Control, Controller } from 'react-hook-form';
import { IShippingModalFormValues } from '@modules/orders/components/ShippingItems/CreateShippingModal';
import { ShippingMethodSelect } from '@modules/settings/components/shipping/ShippingMethodSelect';
import { IOrderItem } from '@src/entity/Order/Order';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

const s = {
  container: css`
    padding: var(--x2);
    box-sizing: border-box;
  `,
};

interface IShippingModalModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  orderItems: IOrderItem[];
  onSubmit: () => void;
  control: Control<IShippingModalFormValues>;
  refetch: () => Promise<void>;
  isDirty: boolean;
}

export const ShippingModal = ({
  open,
  onClose,
  loading,
  orderItems,
  onSubmit,
  control,
  refetch,
  isDirty,
}: IShippingModalModalProps) => {
  const intl = useIntl();
  return (
    <Modal
      open={open}
      width={1000}
      title={intl.formatMessage({ id: t('orders.shippingDetails.title') })}
      onOk={onSubmit}
      onCancel={onClose}
      cancelButtonProps={{
        loading,
        'data-testid': 'shipping-modal-cancel-button',
      }}
      okButtonProps={{
        loading,
        disabled: !isDirty,
        'data-testid': 'shipping-modal-submit-button',
      }}
      okText={intl.formatMessage({ id: t('common.save') })}
    >
      <div css={s.container}>
        <ShippingOrderItems items={orderItems} refetch={refetch} />
        <Divider
          css={css`
            margin: 0 0 var(--x6);
          `}
        />
        <Typography.Text
          css={css`
            font-size: var(--font-size-md);
          `}
          strong
        >
          {intl.formatMessage({ id: t('orders.shipping.trackingInfo') })}
        </Typography.Text>
        <Flex gap="4" mt="4">
          <Box w="100%">
            <Label>
              {intl.formatMessage({ id: t('orders.shippingDetails.method.label') })}
            </Label>
            <Controller
              control={control}
              name="shippingMethod"
              render={({ field }) => (
                <ShippingMethodSelect
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Box>
          <Box w="100%">
            <Label>{intl.formatMessage({ id: t('orders.shipping.trackingCode') })}</Label>
            <Controller
              control={control}
              name="trackingCode"
              render={({ field }) => (
                <Input
                  data-testid="tracking-code-field"
                  placeholder={intl.formatMessage({ id: t('orders.shipping.trackingNumber') })}
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Box>
        </Flex>
      </div>
    </Modal>
  );
};
