import { getUiFilterSelectProps } from '@components/forms/EntitySelect';
import { useCrmColumns } from '@modules/crm/hooks/crm';
import { Select } from 'antd';
import { Variant } from 'antd/es/config-provider';

interface ICrmColumnSelectProps {
  onChange: (value: ID) => void;
  value: ID | null;
  status?: 'error' | undefined;
  showValue?: boolean;
  placeholder?: string;
  variant?: Variant;
  multiple?: boolean;
}

export const CrmColumnSelect = ({
  onChange,
  value,
  status,
  multiple,
  variant,
  ...props
}: ICrmColumnSelectProps) => {
  const { columns } = useCrmColumns();

  if (variant === 'borderless') {
    return (
      <Select
        variant="borderless"
        showSearch={false}
        filterOption={false}
        placeholder={props.placeholder || 'Select a stage'}
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
        options={columns.map((it) => ({
          label: it.title,
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
      placeholder={props.placeholder || 'Select a board'}
      onChange={(value) => onChange(value)}
      value={value}
      style={{ width: '100%' }}
      options={columns.map((it) => ({
        label: it.title,
        value: it.id,
      }))}
      status={status}
      {...props}
    />
  );
};
