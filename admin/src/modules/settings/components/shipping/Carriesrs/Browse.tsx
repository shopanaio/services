import { EntitySelect } from '@components/forms/EntitySelect';
import { IShippingService } from '@src/entity/Services/ShippingService';
import { Space } from 'antd';
import { Variant } from 'antd/es/config-provider';
import { useState } from 'react';

interface ICarrierSelectProps {
  onChange: (value: IShippingService[]) => void;
  value: IShippingService[];
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
  showValue = false,
  variant,
  multiple,
}: ICarrierSelectProps) => {
  const [browsing, setBrowsing] = useState(false);

  return (
    <Space.Compact style={{ width: '100%' }}>
      <EntitySelect<IShippingService>
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
