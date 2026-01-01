import { getUiFilterSelectProps } from '@components/forms/EntitySelect';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { useShippingMethods } from '@modules/settings/hooks/useShippingMethods';
import { IShippingMethod } from '@src/entity/ShippingMethod/ShippingMethod';
import { Button, Radio, Select, Tabs, Typography } from 'antd';
import { Variant } from 'antd/es/config-provider';

interface IShippingMethodSelectProps {
  onChange: (value: IShippingMethod) => void;
  value: IShippingMethod | null;
  status?: 'error' | undefined;
  showValue?: boolean;
  placeholder?: string;
  variant?: Variant;
  multiple?: boolean;
}

export const ShippingMethodsTabs = ({
  onChange,
  value,
  status,
  variant,
  multiple,

  ...props
}: IShippingMethodSelectProps) => {
  const { shippingMethods } = useShippingMethods();

  if (0 && !shippingMethods.length) {
    return (
      <Typography.Text type="secondary">No shipping methods</Typography.Text>
    );
  }

  if (1) {
    return (
      <Flex direction="column" gap="2">
        {[
          { name: 'Test shipping method 1', id: '1' },
          { name: 'Test shipping method 2', id: '2' },
          { name: 'Test shipping method 3', id: '3' },
        ].map((it, idx) => (
          <Button
            css={css`
              justify-content: flex-start;
              min-height: 40px;
            `}
            key={it.id}
            {...(idx === 0 || value?.id === it.id
              ? { type: 'default' }
              : { type: 'text' })}
          >
            {it.name}
          </Button>
        ))}
      </Flex>
    );
  }

  if (variant === 'borderless') {
    return (
      <Select
        variant="borderless"
        showSearch={false}
        filterOption={false}
        placeholder={props.placeholder || 'Select method'}
        labelInValue
        mode="multiple"
        onChange={(_, options) => {
          onChange(options.map((it: any) => it.data));
        }}
        maxCount={multiple ? undefined : 1}
        value={((value as any) || []).map((it: any) => ({
          label: it.name,
          value: it.id,
          data: it,
        }))}
        style={{ width: '100%', minWidth: 120 }}
        options={shippingMethods.map((it) => ({
          label: it.name,
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
      placeholder={props.placeholder || 'Select method'}
      labelInValue
      onChange={(_, { data }: any) => onChange(data)}
      value={
        value
          ? {
              label: value.name,
              value: value.id,
              data: value,
            }
          : null
      }
      style={{ width: '100%' }}
      options={shippingMethods.map((it) => ({
        label: it.name,
        value: it.id,
        data: it,
      }))}
      status={status}
      {...props}
    />
  );
};
