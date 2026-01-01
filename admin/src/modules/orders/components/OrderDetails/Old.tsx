import { isEqual } from 'lodash';
import { css } from '@emotion/react';
import { Dropdown, Modal, Tabs, Typography } from 'antd';
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from 'react-hook-form';
import { useEffect, useState } from 'react';
import { ValidationAlert } from '@components/forms/ValidationAlert';
import { AddressForm } from '@components/forms/Address';
import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { TbFileInvoice } from 'react-icons/tb';
import { MdExpandMore, MdOutlineLocalShipping } from 'react-icons/md';
import { ApiUpdateOrderInput } from '@src/graphql';
import { emptyAddress } from '@modules/orders/defs';
import { IOrderFormValues } from '@modules/orders/types';
import { Flex } from '@components/utility/Flex';
import { PaymentMethodSelect } from '@modules/settings/components/payment/PaymentMethodSelect';
import { ShippingMethodSelect } from '@modules/settings/components/shipping/ShippingMethodSelect';
import { useUpdateOrder } from '@modules/orders/hooks/mutations';

const s = {
  container: css`
    padding: var(--x2);
    box-sizing: border-box;
  `,
};

type IOrderDetailsFormValue = Pick<
  IOrderFormValues,
  'billingAddress' | 'paymentMethod' | 'shippingAddress' | 'shippingMethod'
> & {
  billingAddressEnabled: boolean;
  useShippingAddress: boolean;
};

interface IOrderDetailsModalProps {
  open: boolean;
  onClose: () => void;
}

export const PaymentDetailsModal = ({
  open,
  onClose,
}: IOrderDetailsModalProps) => {
  const { getValues } = useFormContext();
  const { updateOrder } = useUpdateOrder();
  const [addressTab, setAddressTab] = useState('shipping');

  const methods = useForm({
    defaultValues: {
      paymentMethod: null,
      shippingMethod: null,
      billingAddress: {},
      shippingAddress: {},
      billingAddressEnabled: true,
      useShippingAddress: true,
    } as IOrderDetailsFormValue,
  });

  const { handleSubmit, formState, reset } = methods;
  const { isDirty, dirtyFields } = formState;

  const [billingAddressEnabled, useShippingAddress] = methods.watch([
    'billingAddressEnabled',
    'useShippingAddress',
  ]);

  const setValue = (
    name: keyof IOrderDetailsFormValue,
    value: IOrderDetailsFormValue[keyof IOrderDetailsFormValue],
  ) => {
    methods.setValue(name, value, { shouldDirty: true });
  };

  const setUseShippingAddress = () => {
    setValue('billingAddressEnabled', true);
    setValue('useShippingAddress', true);
  };

  const addBillingAddress = () => {
    setValue('billingAddress', emptyAddress);
    setValue('billingAddressEnabled', true);
    setValue('useShippingAddress', false);
  };

  const deleteBillingAddress = () => {
    setValue('billingAddress', null);
    setValue('billingAddressEnabled', false);
    setValue('useShippingAddress', false);
  };

  const editBillingAddress = () => {
    setValue('useShippingAddress', false);
  };

  useEffect(() => {
    if (open) {
      setAddressTab('shipping');

      const [paymentMethod, shippingMethod, billingAddress, shippingAddress] =
        getValues([
          'paymentMethod',
          'shippingMethod',
          'billingAddress',
          'shippingAddress',
        ]);

      const { id: baId, ...billingAddressData } = billingAddress || {};
      const { id: _saId, ...shippingAddressData } = shippingAddress || {};

      const billingAddressEnabled = !!baId;
      const useShippingAddress =
        billingAddressEnabled &&
        isEqual(billingAddressData, shippingAddressData);

      reset({
        billingAddressEnabled,
        useShippingAddress,
        billingAddress,
        paymentMethod,
        shippingAddress,
        shippingMethod,
      });
    }
  }, [reset, getValues, open]);

  const onOk = handleSubmit(async (data) => {
    const id = getValues('id');

    const payload = {
      id,
      items: {},
    } as ApiUpdateOrderInput;

    if (dirtyFields.paymentMethod) {
      payload.payment = {
        billingAddress: null,
        paymentMethodId: data.paymentMethod?.id,
      };
    }

    if (dirtyFields.shippingMethod) {
      payload.shipping = {
        shippingAddress: null,
        shippingMethodId: data.paymentMethod?.id,
      };
    }

    await updateOrder(payload);
    onClose();
  });

  return (
    <FormProvider {...methods}>
      <Modal
        open={open}
        width={1000}
        centered
        title="Order details"
        onOk={onOk}
        onCancel={onClose}
        cancelButtonProps={{
          // loading,
          'data-testid': 'modal-cancel-button',
        }}
        okButtonProps={{
          disabled: !isDirty,
          // loading,
          'data-testid': 'modal-submit-button',
        }}
        okText="Save"
      >
        <div css={s.container}>
          <ValidationAlert errors={formState.errors} />
          <Flex gap="4" mt="4" mb="6">
            <Controller
              control={methods.control}
              name="paymentMethod"
              render={({ field, fieldState }) => {
                return (
                  <Box w="100%">
                    <Label>Billing method</Label>
                    <PaymentMethodSelect
                      value={field.value}
                      data-testid="payment-name-input"
                      onChange={field.onChange}
                      placeholder="Payment method"
                      status={fieldState?.invalid ? 'error' : undefined}
                    />
                  </Box>
                );
              }}
            />
            <Controller
              control={methods.control}
              name="shippingMethod"
              render={({ field, fieldState }) => {
                return (
                  <Box w="100%">
                    <Label>Shipping method</Label>
                    <ShippingMethodSelect
                      value={field.value}
                      data-testid="payment-name-input"
                      onChange={field.onChange}
                      placeholder="Payment method"
                      status={fieldState?.invalid ? 'error' : undefined}
                    />
                  </Box>
                );
              }}
            />
          </Flex>
          <Tabs
            activeKey={addressTab}
            onChange={setAddressTab}
            items={[
              {
                key: 'shipping',
                label: 'Shipping address',
                icon: <MdOutlineLocalShipping />,
                children: (
                  <Box minH="440px">
                    <AddressForm
                      control={methods.control}
                      name="shippingAddress"
                    />
                  </Box>
                ),
              },
              {
                key: 'invoice',
                label: (
                  <span
                    css={css`
                      display: inline-flex;
                      align-items: center;
                    `}
                  >
                    Invoice address
                    <Dropdown
                      placement="bottomRight"
                      trigger={['click']}
                      menu={{
                        items: billingAddressEnabled
                          ? [
                              {
                                key: 'same',
                                label: 'Use same as shipping',
                                onClick: setUseShippingAddress,
                                disabled: useShippingAddress,
                              },
                              ...(useShippingAddress
                                ? [
                                    {
                                      key: 'change',
                                      label: 'Edit address',
                                      onClick: editBillingAddress,
                                    },
                                  ]
                                : []),
                              {
                                key: 'delete',
                                label: 'Delete address',
                                onClick: deleteBillingAddress,
                              },
                            ]
                          : [
                              {
                                key: 'add',
                                label: 'Add address',
                                onClick: addBillingAddress,
                              },
                              {
                                key: 'same',
                                label: 'Use same as shipping',
                                onClick: setUseShippingAddress,
                                disabled: useShippingAddress,
                              },
                            ],
                      }}
                    >
                      <span
                        css={css`
                          width: 40px;
                          display: inline-flex;
                          justify-content: center;
                          margin-right: -12px;
                        `}
                      >
                        <MdExpandMore size={18} />
                      </span>
                    </Dropdown>
                  </span>
                ),
                icon: <TbFileInvoice />,
                children: (
                  <Box minH="440px">
                    {useShippingAddress ? (
                      <Typography.Text type="secondary">
                        Invoice address is the same as shipping address
                      </Typography.Text>
                    ) : billingAddressEnabled ? (
                      <AddressForm
                        control={methods.control}
                        name="billingAddress"
                        disabled={!billingAddressEnabled || useShippingAddress}
                      />
                    ) : (
                      <Typography.Text type="secondary">
                        No invoice address
                      </Typography.Text>
                    )}
                  </Box>
                ),
              },
            ]}
          />
        </div>
      </Modal>
    </FormProvider>
  );
};
