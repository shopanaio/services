import { NumberInput } from '@components/forms/NumberInput';
import { weightUniOptions } from '@src/defs/constants';
import { WeightUnit } from '@src/graphql';
import { Button, Dropdown, Space } from 'antd';
import { Variant } from 'antd/es/config-provider';

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
  variant?: Variant;
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
          items: Object.values(weightUniOptions),
          selectedKeys: [unit],
          onClick: ({ key }) => onChangeUnit?.(key as WeightUnit),
        }}
        trigger={['click']}
        placement="bottomRight"
      >
        <Button data-testid="weight-unit-menu-button">
          {weightUniOptions[unit]?.label || '-'}
        </Button>
      </Dropdown>
    </Space.Compact>
  );
};
