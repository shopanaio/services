import { BorderlessSelect } from '@/components/forms/BorderlessInput';
import {
  StockStatuses,
  stockStatuses,
} from '@/defs/constants';
import { Select, SelectProps } from 'antd';

interface IStockStatusSelectProps extends SelectProps {
  value: string | string[] | null;
  onChange: (value: string | string[]) => void;
  status?: 'error' | undefined;
  disabled?: boolean;
  multiple?: boolean;
  style?: React.CSSProperties;
  defaultStatus?: StockStatuses | null;
  variant?: 'borderless';
}

export const StockStatusSelect = ({
  onChange,
  value,
  status,
  disabled,
  multiple,
  style,
  variant,
  defaultStatus = StockStatuses.IN_STOCK,
  ...props
}: IStockStatusSelectProps) => {
  const defaultStatusLabel = defaultStatus
    ? stockStatuses[defaultStatus]?.label
    : null;

  const Component = variant === 'borderless' ? BorderlessSelect : Select;

  return (
    <Component
      variant={variant}
      mode={multiple ? 'tags' : undefined}
      value={multiple ? value || [] : value || defaultStatusLabel || null}
      onChange={(value: string | string[]) => onChange(value)}
      options={(Object.values(stockStatuses) || []).map((status) => ({
        label: status.label,
        value: status.value,
        'data-testid': `stock-status-option-${status.value
          .toLowerCase()
          .replace(/_/g, '-')}`,
      }))}
      style={{ width: '100%', ...style }}
      disabled={disabled}
      placeholder="Select stock status"
      status={status}
      data-testid="stock-status-select"
      {...props}
    />
  );
};
