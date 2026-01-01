import { EntitySelect } from '@components/forms/EntitySelect';
import { IShippingMethod } from '@src/entity/Services/ShippingMethod';
import { Space } from 'antd';
import { Variant } from 'antd/es/config-provider';
import { useState } from 'react';

interface IShippingMethodSelectProps {
  onChange: (value: IShippingMethod[]) => void;
  value: IShippingMethod[];
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
  showValue = false,
  variant,
  multiple,
}: IShippingMethodSelectProps) => {
  const [browsing, setBrowsing] = useState(false);

  return (
    <Space.Compact style={{ width: '100%' }}>
      <EntitySelect<IShippingMethod>
        showValue={showValue}
        renderLabel={(it) => it.name}
        variant={variant}
        data-testid="shipping-method-select"
        filterOption={false}
        placeholder="Select method"
        value={value}
        style={{ width: '100%' }}
        options={[]}
        status={status}
        open={false}
        onClick={() => setBrowsing(true)}
        onChange={onChange}
      />
    </Space.Compact>
  );
};
