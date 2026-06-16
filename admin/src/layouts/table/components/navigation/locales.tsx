import { TranslationOutlined } from '@ant-design/icons';
import { Button, Dropdown, Flex, Radio, Typography } from 'antd';
import { useState } from 'react';

interface LocaleOption {
  label: string;
  value: string;
}

export interface ILocalesProps {
  value: string;
  onChange: (value: string) => void;
  options: LocaleOption[];
  label?: string;
}

export const Locales = ({
  value = '',
  options = [],
  onChange: onChangeProp,
  label = 'Language',
}: ILocalesProps) => {
  const [open, setOpen] = useState(false);

  const renderLabel = () =>
    options.find(({ value: v }) => v === value)?.label || label;

  const items = options.map(({ label, value: itemValue }) => ({
    label: (
      <Flex>
        <Radio
          checked={itemValue === value}
          onChange={() => onChangeProp(itemValue)}
        />
        <Typography.Text>{label}</Typography.Text>
      </Flex>
    ),
    key: itemValue,
  }));

  return (
    <Dropdown
      disabled={!value.length}
      trigger={['click']}
      menu={{ items, style: { minWidth: 150 } }}
      open={open}
      onOpenChange={setOpen}
    >
      <Button disabled={!options.length} icon={<TranslationOutlined />}>
        {renderLabel()}
      </Button>
    </Dropdown>
  );
};
