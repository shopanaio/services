import { NumberInput } from '@/components/forms/NumberInput';
import { fromCents, toCents } from '@/utils/price';
import { InputProps } from 'antd';

interface ICurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  'data-testid'?: string;
  isNegative?: boolean;
}

export const CurrencyInput = ({
  value,
  onChange,
  status,
  disabled,
  isNegative,
  'data-testid': dataTestId,
  className,
  id,
  type,
  variant,
  ...props
}: ICurrencyInputProps & InputProps) => {
  return (
    <NumberInput
      id={id}
      type={type as any}
      {...props}
      data-antd-prefix={isNegative ? '— $' : '$'}
      data-antd-variant={variant}
      value={fromCents(value)}
      className={className}
      disabled={disabled}
      decimalScale={2}
      placeholder="0"
      status={status}
      data-testid={dataTestId}
      onChange={(value) => {
        onChange(toCents(value as number));
      }}
    />
  );
};
