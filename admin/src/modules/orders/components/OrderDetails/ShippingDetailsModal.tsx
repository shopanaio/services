import { css } from '@emotion/react';
import { Avatar, Modal, Typography } from 'antd';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { ValidationAlert } from '@components/forms/ValidationAlert';
import { AddressForm } from '@components/forms/Address';
import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { ApiOrderShippingInfoInput, OrderStatusEnum } from '@src/graphql';
import { ShippingMethodSelect } from '@modules/settings/components/shipping/ShippingMethodSelect';
import { useUpdateOrder } from '@modules/orders/hooks/mutations';
import { IOrder } from '@src/entity/Order/Order';
import { Flex } from '@components/utility/Flex';
import { MdClose } from 'react-icons/md';
import { notify } from '@components/feedback/notification';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

const s = {
  container: css`
    padding: var(--x2);
    box-sizing: border-box;
  `,
};

type IOrderDetailsFormValue = Pick<
  IOrder,
  'shippingAddress' | 'shippingMethod'
>;

interface IOrderDetailsModalProps {
  open: boolean;
  onClose: () => void;
  order: IOrder;
  refetch: () => Promise<void>;
}

export const ShippingDetailsModal = ({
  open,
  onClose,
  order,
  refetch,
}: IOrderDetailsModalProps) => {
  const { updateOrder } = useUpdateOrder();
  const intl = useIntl();

  const methods = useForm({
    defaultValues: {
      shippingMethod: null,
      shippingAddress: {},
    } as IOrderDetailsFormValue,
  });

  const [loading, setLoading] = useState(false);
  const { handleSubmit, formState, reset } = methods;
  const { isDirty, dirtyFields } = formState;
  const isDraft = order.status === OrderStatusEnum.Draft;

  useEffect(() => {
    if (open) {
      reset({
        shippingAddress: order.shippingAddress,
        shippingMethod: order.shippingMethod,
      });
    }
  }, [reset, order, open]);

  const onOk = handleSubmit(async (data) => {
    const payload = {
      id: order.id,
      shipping: {} as ApiOrderShippingInfoInput,
    };

    if (dirtyFields.shippingMethod) {
      payload.shipping.shippingMethodId = data.shippingMethod?.id;
    }

    if (dirtyFields.shippingAddress) {
      payload.shipping.shippingAddress = {
        id: order.shippingAddress?.id,
        ...data.shippingAddress,
      };
    }

    try {
      setLoading(true);
      await updateOrder(payload);
      await refetch();
      notify.success(intl.formatMessage({ id: t('orders.shippingDetails.updated') }));
      onClose();
    } catch {
      notify.error(intl.formatMessage({ id: t('orders.shippingDetails.updateFailed') }));
    } finally {
      setLoading(false);
    }
  });

  return (
    <FormProvider {...methods}>
      <Modal
        open={open}
        width={1000}
        centered
        title={intl.formatMessage({ id: t('orders.shippingDetails.title') })}
        onOk={onOk}
        onCancel={onClose}
        footer={(_, { OkBtn, CancelBtn }) => {
          return (
            <>
              <CancelBtn />
              {isDraft && <OkBtn />}
            </>
          );
        }}
        cancelButtonProps={{
          // loading,
          'data-testid': 'modal-cancel-button',
        }}
        okButtonProps={{
          disabled: !isDraft || !isDirty,
          loading,
          'data-testid': 'modal-submit-button',
        }}
        okText={intl.formatMessage({ id: t('common.save') })}
      >
        <div css={s.container}>
          <ValidationAlert errors={formState.errors} />
          <div
            css={css`
              display: grid;
              grid-template-columns: 250px 1fr;
              grid-column-gap: var(--x4);
            `}
          >
            <Controller
              control={methods.control}
              name="shippingMethod"
              render={({ field, fieldState }) => {
                return (
                  <Box
                    css={css`
                      border-right: 1px solid var(--color-gray-4);
                      padding-right: var(--x4);
                    `}
                  >
                    <Label>
                      {intl.formatMessage({ id: t('orders.shippingDetails.method.label') })}
                    </Label>
                    {field.value ? (
                      <Flex gap="2" direction="column">
                        <div
                          css={css`
                            display: flex;
                            flex-direction: column;
                            border: 1px solid var(--color-border);
                            border-radius: var(--radius-base);
                            padding: var(--x3) var(--x3) var(--x2);
                          `}
                        >
                          <Flex gap="2">
                            <Avatar
                              src={field.value.service?.cover?.url}
                              shape="square"
                            >
                              {field.value.service?.name?.charAt(0)}
                            </Avatar>
                            <Flex direction="column">
                              <Typography.Text
                                css={css`
                                  font-weight: 700;
                                  margin-top: -3px;
                                  margin-bottom: -5px;
                                `}
                              >
                                {field.value.service?.name}
                              </Typography.Text>
                              <Typography.Text>
                                {field.value.name}
                              </Typography.Text>
                            </Flex>
                          </Flex>
                        </div>
                        {isDraft && (
                          <Flex
                            role="button"
                            align="center"
                            gap="1"
                            css={css`
                              cursor: pointer;
                            `}
                            onClick={() => field.onChange(null)}
                          >
                            <MdClose />
                            <Typography.Text>
                              {intl.formatMessage({ id: t('common.clear') })}
                            </Typography.Text>
                          </Flex>
                        )}
                      </Flex>
                    ) : isDraft ? (
                      <ShippingMethodSelect
                        value={field.value}
                        data-testid="payment-name-input"
                        onChange={field.onChange}
                        placeholder={intl.formatMessage({ id: t('orders.shippingDetails.method.placeholder') })}
                        status={fieldState?.invalid ? 'error' : undefined}
                      />
                    ) : (
                      <Typography.Text>
                        {intl.formatMessage({ id: t('table.notSet') })}
                      </Typography.Text>
                    )}
                  </Box>
                );
              }}
            />
            <Box minH="440px">
              <AddressForm
                control={methods.control}
                name="shippingAddress"
                readOnly={!isDraft}
              />
            </Box>
          </div>
        </div>
      </Modal>
    </FormProvider>
  );
};
