import { getUiFilterSelectProps } from '@components/forms/EntitySelect';
import { useShippingMethods } from '@modules/settings/hooks/services';
import { IShippingMethod } from '@src/entity/Services/ShippingMethod';
import { Select } from 'antd';
import { Variant } from 'antd/es/config-provider';

interface IShippingMethodSelectProps {
  onChange: (value: IShippingMethod) => void;
  value: IShippingMethod | null;
  status?: 'error' | undefined;
  showValue?: boolean;
  placeholder?: string;
  variant?: Variant;
  multiple?: boolean;
}

export const ShippingMethodSelect = ({
  onChange,
  value,
  status,
  variant,
  multiple,
  ...props
}: IShippingMethodSelectProps) => {
  const { shippingMethods } = useShippingMethods();

  if (variant === 'borderless') {
    return (
      <Select
        variant="borderless"
        showSearch={false}
        filterOption={false}
        placeholder={props.placeholder || 'Select method'}
        labelInValue
        mode="multiple"
        data-testid="shipping-method-select"
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
        options={shippingMethods.map((it) => ({
          label: it.name,
          value: it.id,
          data: it,
          'data-testid': 'shipping-method-option',
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
      placeholder={props.placeholder || 'Select method'}
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
      options={shippingMethods.map((it) => ({
        label: it.name,
        value: it.id,
        data: it,
      }))}
      status={status}
      {...props}
    />
  );
};
