/* eslint-disable jsx-a11y/no-autofocus */
import { UiFilterRelationControl } from '@components/filters/UiFilterWidget/UiFilterRelationControl';
import { CurrencyInput } from '@components/forms/CurrencyInput';
import { getUiFilterSelectProps } from '@components/forms/EntitySelect';
import { WeightInput } from '@components/forms/WeightInput';
import { css } from '@emotion/react';
import { UiFilter } from '@src/entity/UiFilter';
import { DatePicker, Input, Select } from 'antd';
import { useEffect, useRef } from 'react';
import ContentEditable from 'react-contenteditable';

const { UiFilterType } = UiFilter;

export interface UiFilterFilterValueControlProps {
  value: UiFilter.IUiFilterValue;
  onChange: (value: any | any[]) => void;
  filter: UiFilter.IUiFilter | null;
  invalid?: boolean;
}

export const UiFilterFilterValueControl = ({
  value: valueProp,
  onChange,
  filter,
}: UiFilterFilterValueControlProps) => {
  const ceRef = useRef<ContentEditable>(null);

  useEffect(() => {
    if (ceRef.current?.el?.current) {
      ceRef.current.el.current.focus();
    }
  }, []);

  if (!filter || !valueProp) {
    return <Input disabled value="Internal. No value" />;
  }

  const { operator, value, entity, type } = valueProp;

  const isMultiple = [
    UiFilter.UiFilterOperator.In,
    UiFilter.UiFilterOperator.NotIn,
  ].includes(operator);

  if (entity && type === UiFilterType.Relation) {
    return (
      <UiFilterRelationControl
        value={value}
        variant="borderless"
        isMultiple={isMultiple}
        onChange={onChange}
        entity={entity}
      />
    );
  }

  if (type === UiFilterType.Date) {
    if (operator === UiFilter.UiFilterOperator.Between) {
      return (
        <DatePicker.RangePicker
          format="MM-DD-YYYY"
          variant="borderless"
          autoFocus
          style={{ width: 220 }}
          value={value}
          onChange={onChange}
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
        onChange={(value) => onChange(value ? [value] : [])}
      />
    );
  }

  if (type === UiFilterType.Price) {
    return (
      <CurrencyInput
        autoFocus
        width="100px"
        variant="borderless"
        value={(Array.isArray(value) ? value?.[0] : value) || 0}
        onChange={(value) => onChange(value ? [value] : [])}
      />
    );
  }

  if (type === UiFilterType.Weight) {
    return (
      <WeightInput
        autoFocus
        width="100px"
        variant="borderless"
        value={(Array.isArray(value) ? value?.[0] : value) || 0}
        onChange={(value) => onChange(value ? [value] : [])}
      />
    );
  }

  if (filter?.options?.length) {
    return (
      <Select
        options={filter.options}
        placeholder="Select..."
        value={value}
        onChange={onChange}
        maxCount={isMultiple ? undefined : 1}
        {...getUiFilterSelectProps(value)}
      />
    );
  }

  const html = (Array.isArray(value) ? value?.[0] : value) || '';

  if (type === UiFilterType.Number) {
    const stringHtml = typeof html === 'number' ? html.toString() : html;

    return (
      <ContentEditable
        html={stringHtml}
        onChange={({ target }) => {
          const nextValue = target.value?.trim?.();
          let floatValue = 0;

          if (!nextValue.match(/[^0-9]/)) {
            floatValue = parseFloat(nextValue);
          } else {
            floatValue = parseFloat(nextValue.replace(/[^0-9.]/g, ''));
          }

          onChange(floatValue ? [floatValue] : []);
        }}
        css={getContentEditableStyle({ value: html, placeholder: '0.00' })}
        // @ts-expect-error ...
        ref={ceRef}
      />
    );
  }

  return (
    <ContentEditable
      html={html}
      onChange={({ target }) => {
        const nextValue = target.value?.trim?.();
        onChange(nextValue ? [nextValue] : []);
      }}
      css={getContentEditableStyle({ value: html })}
      // @ts-expect-error ...
      ref={ceRef}
    />
  );
};

function getContentEditableStyle({
  placeholder,
  value,
}: {
  value: string | number;
  placeholder?: string;
}) {
  return css`
    min-width: 40px;
    padding: 0 var(--x2);
    height: 32px;
    line-height: 32px;
    border: none;
    background: none;
    display: flex;
    align-items: center;
    outline: none;
    &::after {
      display: ${value ? 'none' : 'block'};
      content: '${placeholder || 'Type here...'}';
      color: var(--color-gray-6);
    }
  `;
}
