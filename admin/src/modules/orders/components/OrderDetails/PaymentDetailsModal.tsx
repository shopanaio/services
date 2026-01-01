import { css } from '@emotion/react';
import { Avatar, Modal, Typography } from 'antd';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { ValidationAlert } from '@components/forms/ValidationAlert';
import { AddressForm } from '@components/forms/Address';
import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { ApiOrderPaymentInfoInput, OrderStatusEnum } from '@src/graphql';
import { useUpdateOrder } from '@modules/orders/hooks/mutations';
import { IOrder } from '@src/entity/Order/Order';
import { Flex } from '@components/utility/Flex';
import { MdClose } from 'react-icons/md';
import { notify } from '@components/feedback/notification';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { PaymentMethodSelect } from '@modules/settings/components/payment/PaymentMethodSelect';

const s = {
  container: css`
    padding: var(--x2);
    box-sizing: border-box;
  `,
};

type IOrderDetailsFormValue = Pick<IOrder, 'billingAddress' | 'paymentMethod'>;

interface IPaymentDetailsModalProps {
  open: boolean;
  onClose: () => void;
  order: IOrder;
  refetch: () => Promise<void>;
}

export const PaymentDetailsModal = ({
  open,
  onClose,
  order,
  refetch,
}: IPaymentDetailsModalProps) => {
  const { updateOrder } = useUpdateOrder();
  const intl = useIntl();

  const methods = useForm({
    defaultValues: {
      paymentMethod: null,
      billingAddress: {},
    } as IOrderDetailsFormValue,
  });

  const [loading, setLoading] = useState(false);
  const { handleSubmit, formState, reset } = methods;
  const { isDirty, dirtyFields } = formState;
  const isDraft = order.status === OrderStatusEnum.Draft;

  useEffect(() => {
    if (open) {
      reset({
        billingAddress: order.billingAddress,
        paymentMethod: order.paymentMethod,
      });
    }
  }, [reset, order, open]);

  const onOk = handleSubmit(async (data) => {
    const payload = {
      id: order.id,
      payment: {} as ApiOrderPaymentInfoInput,
    };

    if (dirtyFields.paymentMethod) {
      payload.payment.paymentMethodId = data.paymentMethod?.id;
    }

    if (dirtyFields.billingAddress) {
      payload.payment.billingAddress = {
        id: order.billingAddress?.id,
        ...data.billingAddress,
      };
    }

    try {
      setLoading(true);
      await updateOrder(payload);
      await refetch();
      notify.success(
        intl.formatMessage({ id: t('orders.paymentDetails.updated') }),
      );
      onClose();
    } catch {
      notify.error(
        intl.formatMessage({ id: t('orders.paymentDetails.updateFailed') }),
      );
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
        title={intl.formatMessage({ id: t('orders.paymentDetails.title') })}
        onOk={onOk}
        onCancel={onClose}
        transitionName="ant-fade"
        maskTransitionName="ant-fade"
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
              name="paymentMethod"
              render={({ field, fieldState }) => {
                return (
                  <Box
                    css={css`
                      border-right: 1px solid var(--color-gray-4);
                      padding-right: var(--x4);
                    `}
                  >
                    <Label>
                      {intl.formatMessage({ id: t('orders.paymentDetails.method.label') })}
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
                      <PaymentMethodSelect
                        value={field.value}
                        data-testid="payment-name-input"
                        onChange={field.onChange}
                        placeholder={intl.formatMessage({ id: t('orders.paymentDetails.method.placeholder') })}
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
                name="billingAddress"
                readOnly={!isDraft}
              />
            </Box>
          </div>
        </div>
      </Modal>
    </FormProvider>
  );
};
