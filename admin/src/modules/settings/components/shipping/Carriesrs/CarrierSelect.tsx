import { getUiFilterSelectProps } from '@components/forms/EntitySelect';
import { useShippingServices } from '@modules/settings/hooks/services';
import { IShippingService } from '@src/entity/Services/ShippingService';
import { Select } from 'antd';
import { Variant } from 'antd/es/config-provider';

interface ICarrierSelectProps {
  onChange: (value: IShippingService) => void;
  value: IShippingService | null;
  status?: 'error' | undefined;
  showValue?: boolean;
  placeholder?: string;
  variant?: Variant;
  multiple?: boolean;
}

export const CarrierSelect = ({
  onChange,
  value,
  status,
  variant,
  multiple,
  ...props
}: ICarrierSelectProps) => {
  const { shippingMethods } = useShippingServices();

  if (variant === 'borderless') {
    return (
      <Select
        variant="borderless"
        showSearch={false}
        filterOption={false}
        placeholder={props.placeholder || 'Select method'}
        labelInValue
        mode="multiple"
        onChange={(_, options) => {
          onChange(options.map((it: any) => it.data));
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
              value: value.code,
              data: value,
            }
          : null
      }
      style={{ width: '100%' }}
      options={shippingMethods.map((it) => ({
        label: it.name,
        value: it.code,
        data: it,
      }))}
      status={status}
      {...props}
    />
  );
};
