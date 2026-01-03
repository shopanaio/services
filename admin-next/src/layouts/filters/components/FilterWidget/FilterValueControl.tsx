'use client';

import { DatePicker, Input, InputNumber, Select, SelectProps, Tag, Tooltip } from 'antd';
import type { Dayjs } from 'dayjs';
import { CloseOutlined } from '@ant-design/icons';
import { FilterType, FilterOperator, IFilterSchema, IFilterValue } from '../../core/types';
import { isMultipleValueOperator } from '../../core/operators';
import { RelationControl } from '../RelationControl';

const cropString = (str: string, maxLength: number) => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
};

export const getUiFilterSelectProps = (
  value: unknown[],
  { closable: closableProp = true }: { closable?: boolean } = {},
) => {
  return {
    variant: 'borderless',
    suffixIcon: null,
    maxTagCount: 1,
    autoFocus: true,
    mode: 'multiple',
    showSearch: false,
    dropdownStyle: {
      minWidth: 200,
    },
    style: value?.length
      ? { width: 'fit-content' }
      : { width: '100%', minWidth: 80 },

    tagRender: ({
      label,
      onClose,
      closable,
    }: {
      label: string;
      onClose: (e: React.MouseEvent<HTMLElement>) => void;
      closable: boolean;
    }) => {
      return (
        <Tooltip
          title={label}
          mouseEnterDelay={0.5}
          placement="topLeft"
          arrow={false}
        >
          <Tag
            onClose={onClose}
            closable={closable && closableProp}
            closeIcon={<CloseOutlined style={{ color: 'white' }} />}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--x1)',
              margin: '0 2px',
              fontSize: 'var(--font-size)',
              backgroundColor: 'var(--color-gray-10)',
              color: 'var(--color-gray-1)',
              borderColor: 'var(--color-gray-10)',
            }}
          >
            {cropString(label, 14)}
          </Tag>
        </Tooltip>
      );
    },
  } as Partial<SelectProps>;
};

export interface IFilterValueControlProps {
  filter: IFilterSchema | null;
  value: IFilterValue;
  onChange: (value: unknown) => void;
}

export const FilterValueControl = ({
  filter,
  value: filterValue,
  onChange,
}: IFilterValueControlProps) => {
  if (!filter || !filterValue) {
    return <Input disabled value="No value" style={{ width: 100 }} variant="borderless" />;
  }

  const { operator, value, type } = filterValue;
  const isMultiple = isMultipleValueOperator(operator);

  // Date type
  if (type === FilterType.Date || type === FilterType.DateRange) {
    if (operator === FilterOperator.Between) {
      const rangeValue = Array.isArray(value) && value.length === 2
        ? value as [Dayjs | null, Dayjs | null]
        : [null, null] as [Dayjs | null, Dayjs | null];

      return (
        <DatePicker.RangePicker
          format="MM-DD-YYYY"
          variant="borderless"
          autoFocus
          style={{ width: 220 }}
          value={rangeValue}
          onChange={(dates) => onChange(dates || [])}
        />
      );
    }

    return (
      <DatePicker
        format="MM-DD-YYYY"
        variant="borderless"
        autoFocus
        style={{ width: 120 }}
        value={Array.isArray(value) ? value?.[0] : value}
        onChange={(v) => onChange(v ? [v] : [])}
      />
    );
  }

  // Price/Number type
  if (type === FilterType.Price || type === FilterType.Number || type === FilterType.Integer) {
    return (
      <InputNumber
        autoFocus
        variant="borderless"
        style={{ width: 100 }}
        value={(Array.isArray(value) ? value?.[0] : value) || 0}
        onChange={(v) => onChange(v !== null ? [v] : [])}
      />
    );
  }

  // Relation type
  if (type === FilterType.Relation && filter.entity) {
    return (
      <RelationControl
        entity={filter.entity}
        value={value}
        onChange={onChange}
        isMultiple={isMultiple}
        variant="borderless"
      />
    );
  }

  // Enum type or any type with options
  if (filter.options?.length) {
    return (
      <Select
        options={filter.options.map((opt) => ({
          label: opt.label,
          value: opt.value as string | number,
        }))}
        placeholder="Select..."
        value={value}
        onChange={onChange}
        maxCount={isMultiple ? undefined : 1}
        {...getUiFilterSelectProps(Array.isArray(value) ? value : [])}
      />
    );
  }

  // Boolean type
  if (type === FilterType.Boolean) {
    const boolValue = Array.isArray(value) ? value : value !== undefined ? [value] : [];
    return (
      <Select
        options={[
          { label: 'True', value: 'true' },
          { label: 'False', value: 'false' },
        ]}
        placeholder="Select..."
        value={boolValue.map((v) => String(v))}
        onChange={(v) => onChange(v.map((s: string) => s === 'true'))}
        maxCount={1}
        {...getUiFilterSelectProps(boolValue)}
      />
    );
  }

  // Default: String input
  return (
    <Input
      autoFocus
      variant="borderless"
      placeholder="Type here..."
      style={{ width: 120 }}
      value={Array.isArray(value) ? value?.[0] : value}
      onChange={(e) => {
        const v = e.target.value?.trim?.();
        onChange(v ? [v] : []);
      }}
    />
  );
};
