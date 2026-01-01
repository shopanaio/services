import { getUiFilterSelectProps } from '@components/forms/EntitySelect';
import { usePaymentMethods } from '@modules/settings/hooks/services';
import { IPaymentMethod } from '@src/entity/Services/PaymentMethod';
import { Select } from 'antd';
import { Variant } from 'antd/es/config-provider';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IPaymentMethodSelectProps {
  onChange: (value: IPaymentMethod) => void;
  value: IPaymentMethod | null;
  status?: 'error' | undefined;
  showValue?: boolean;
  placeholder?: string;
  variant?: Variant;
  multiple?: boolean;
}

export const PaymentMethodSelect = ({
  onChange,
  value,
  status,
  variant,
  multiple,
  ...props
}: IPaymentMethodSelectProps) => {
  const { paymentMethods } = usePaymentMethods();
  const { formatMessage } = useIntl();

  if (variant === 'borderless') {
    return (
      <Select
        variant="borderless"
        showSearch={false}
        filterOption={false}
        placeholder={
          props.placeholder || formatMessage({ id: t('orders.paymentDetails.method.placeholder') })
        }
        labelInValue
        mode="multiple"
        onChange={(_, options) => {
          onChange((options || []).map((it: any) => it.data));
        }}
        maxCount={multiple ? undefined : 1}
        value={((value as any) || []).map((it: any) => ({
          label: it.name,
          value: it.id,
          data: it,
        }))}
        style={{ width: '100%', minWidth: 120 }}
        options={paymentMethods.map((it) => ({
          label: it.name,
          value: it.id,
          data: it,
        }))}
        status={status}
        {...props}
        {...getUiFilterSelectProps(value as any)}
      />
    );
  }

  return (
    <Select
      filterOption={false}
      placeholder={
        props.placeholder || formatMessage({ id: t('orders.paymentDetails.method.placeholder') })
      }
      labelInValue
      onChange={(_, { data }: any) => onChange(data)}
      value={
        value
          ? {
              label: value.name,
              value: value.id,
              data: value,
            }
          : null
      }
      style={{ width: '100%' }}
      options={paymentMethods.map((it) => ({
        label: it.name,
        value: it.id,
        data: it,
      }))}
      status={status}
      {...props}
    />
  );
};
