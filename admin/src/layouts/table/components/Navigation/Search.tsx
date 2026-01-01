import { Flex } from '@components/utility/Flex';
import { IDropdownOption, IMenuItemType } from '@src/types';
import { Button, Dropdown, Input, Radio, Space, Typography } from 'antd';
import { useState } from 'react';
import { MdSearch } from 'react-icons/md';
import { CgOptions } from 'react-icons/cg';
import { getIconProps } from '@components/styles';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export interface ISearchProps {
  options?: IDropdownOption[];
  searchValue?: string;
  property?: string;
  onChangeProperty: (value: string) => void;
  onChangeSearchValue: (value: string) => void;
}

export const Search = ({
  options = [],
  searchValue,
  property,
  onChangeProperty,
  onChangeSearchValue,
}: ISearchProps) => {
  const [open, setOpen] = useState(false);
  const { formatMessage } = useIntl();

  const items: IMenuItemType[] = options.map(({ label, value: itemValue }) => {
    return {
      label: (
        <Flex gap="2">
          <Radio checked={itemValue === property} />
          <Typography.Text>{label}</Typography.Text>
        </Flex>
      ),
      key: itemValue,
      'data-testid': `menu-item-${itemValue}`,
      onClick: () => onChangeProperty(itemValue),
    };
  });

  return (
    <Space.Compact>
      <Input
        value={searchValue}
        onChange={(e) => onChangeSearchValue(e.target.value)}
        prefix={<MdSearch />}
        placeholder={formatMessage({ id: t('layouts.search.placeholder') })}
        style={{ width: 250 }}
        data-testid="search-input"
      />
      {options.length > 1 && (
        <Dropdown
          disabled={!options.length}
          open={open}
          onOpenChange={setOpen}
          trigger={['click']}
          menu={{ items, style: { width: 282 } }}
          placement="bottomRight"
        >
          <Button
            icon={<CgOptions {...getIconProps(14)} />}
            data-testid="search-dropdown-button"
          />
        </Dropdown>
      )}
    </Space.Compact>
  );
};
