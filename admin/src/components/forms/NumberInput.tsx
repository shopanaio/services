import { BorderlessInput } from '@/components/forms/BorderlessInput';
import { css } from '@emotion/react';
import { Input, InputProps } from 'antd';
import { ReactNode, useMemo } from 'react';
import { NumericFormat } from 'react-number-format';

export interface INumberInputProps {
  value: number;
  onChange: (value: number) => void;
  decimalScale?: number;
}

export const AntdInput = (
  props: InputProps & {
    ['data-antd-prefix']?: ReactNode;
    ['data-antd-suffix']?: ReactNode;
    ['data-antd-variant']?: string;
  },
) => {
  if (props['data-antd-variant'] === 'borderless') {
    return (
      <BorderlessInput
        {...props}
        prefix={props['data-antd-prefix']}
        suffix={props['data-antd-suffix']}
      />
    );
  }

  return (
    <Input
      {...props}
      prefix={props['data-antd-prefix']}
      suffix={props['data-antd-suffix']}
    />
  );
};

export const NumberInput = ({
  value,
  onChange,
  status,
  disabled,
  className,
  id,
  type,
  defaultValue: _defaultValue,
  suffix: _suffix,
  prefix: _prefix,
  decimalScale = 2,
  width = '100%',
  ...props
}: INumberInputProps & InputProps) => {
  return (
    <NumericFormat
      id={id}
      type={type as any}
      {...props}
      customInput={AntdInput}
      value={value || null}
      className={className}
      disabled={disabled}
      allowNegative={false}
      decimalScale={decimalScale}
      placeholder="0"
      status={status}
      css={css`
        width: ${width};
      `}
      onValueChange={({ floatValue }) => {
        if (floatValue == null) {
          onChange(0);
          return;
        }

        onChange(floatValue);
      }}
    />
  );
};

export const AutoWidthNumberInput = ({
  value,
  onChange,
  status,
  disabled,
  className,
  id,
  type,
  defaultValue: _defaultValue,
  suffix: _suffix,
  prefix: _prefix,
  decimalScale = 2,
  minCh = 1,
  maxCh = 10,
  extraCh = 0,
  ...props
}: INumberInputProps &
  InputProps & { minCh?: number; maxCh?: number; extraCh?: number }) => {
  const computedCh = useMemo(() => {
    const raw = value == null ? '' : String(value);
    const onesCount = (raw.match(/1/g) || []).length;
    const otherCount = raw.length - onesCount;

    let widthInCh = onesCount * 0.67 + otherCount * 1 + extraCh;

    if (widthInCh < minCh) {
      widthInCh = minCh;
    }
    if (typeof maxCh === 'number' && widthInCh > maxCh) {
      widthInCh = maxCh;
    }

    return widthInCh;
  }, [value, minCh, maxCh, extraCh]);

  return (
    <NumericFormat
      id={id}
      type={type as any}
      {...props}
      customInput={AntdInput}
      value={value || null}
      className={className}
      disabled={disabled}
      allowNegative={false}
      decimalScale={decimalScale}
      placeholder="0"
      status={status}
      css={css`
        width: ${computedCh + 0.5}ch;
        min-width: 1.5ch;
        transition: width 0s;
      `}
      onValueChange={({ floatValue }) => {
        if (floatValue == null) {
          onChange(0);
          return;
        }

        onChange(floatValue);
      }}
    />
  );
};
