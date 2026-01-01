import { NumberInput } from '@/components/forms/NumberInput';
import { weightUnitOptions } from '@/defs/constants';
import { WeightUnit } from '@/domains/inventory/products/types';
import { Button, Dropdown, Space } from 'antd';

export const WeightInput = ({
  value,
  onChange,
  invalid,
  isDisabled,
  variant,
  unit,
  onChangeUnit,
  ...props
}: {
  value: number;
  onChange: (value: number) => void;
  invalid?: boolean;
  isDisabled?: boolean;
  variant?: 'borderless' | 'outlined' | 'filled';
  width?: string;
  unit: WeightUnit;
  onChangeUnit?: (unit: WeightUnit) => void;
  autoFocus?: boolean;
}) => {
  return (
    <Space.Compact>
      <NumberInput
        decimalScale={3}
        data-testid="weight-input"
        value={value}
        onChange={onChange}
        disabled={isDisabled}
        placeholder="0"
        status={invalid ? 'error' : undefined}
        variant={variant}
        {...props}
      />
      <Dropdown
        menu={{
          items: Object.values(weightUnitOptions),
          selectedKeys: [unit],
          onClick: ({ key }) => onChangeUnit?.(key as WeightUnit),
        }}
        trigger={['click']}
        placement="bottomRight"
      >
        <Button data-testid="weight-unit-menu-button">
          {weightUnitOptions[unit]?.label || '-'}
        </Button>
      </Dropdown>
    </Space.Compact>
  );
};
