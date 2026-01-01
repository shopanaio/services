import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { IDropdownOption } from '@src/types';
import { Button, Dropdown, Radio, Typography } from 'antd';
import { useState } from 'react';
import { MdTranslate } from 'react-icons/md';

const iconProps = {
  size: 14,
  css: css`
    transform: translateY(2px);
  `,
};

export interface ILocalesProps {
  value: string;
  onChange: (value: string) => void;
  options: IDropdownOption[];
}

export const Locales = ({
  value = '',
  options = [],
  onChange: onChangeProp,
}: ILocalesProps) => {
  const [open, setOpen] = useState(false);

  const renderLabel = () =>
    options.find(({ value: v }) => v === value)?.label || 'Language';

  const items = options.map(({ label, value: itemValue }) => {
    return {
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
    };
  });

  return (
    <Dropdown
      disabled={!value.length}
      trigger={['click']}
      menu={{ items, style: { minWidth: 150 } }}
      open={open}
      onOpenChange={setOpen}
    >
      <Button disabled={!options.length} icon={<MdTranslate   />}>
        {renderLabel()}
      </Button>
    </Dropdown>
  );
};
