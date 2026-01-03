import { createStyles } from 'antd-style';
import { SearchOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Dropdown, Flex, Input, Radio, Space, Typography } from 'antd';
import { useState } from 'react';

const useStyles = createStyles({
  input: {
    width: 250,
  },
});

export interface SearchOption {
  label: string;
  value: string;
}

export interface ISearchProps {
  options?: SearchOption[];
  searchValue?: string;
  property?: string;
  onChangeProperty?: (value: string) => void;
  onChangeSearchValue?: (value: string) => void;
  placeholder?: string;
}

export const Search = ({
  options = [],
  searchValue,
  property,
  onChangeProperty,
  onChangeSearchValue,
  placeholder = 'Search...',
}: ISearchProps) => {
  const { styles } = useStyles();
  const [open, setOpen] = useState(false);

  const items = options.map(({ label, value: itemValue }) => ({
    label: (
      <Flex gap="small">
        <Radio checked={itemValue === property} />
        <Typography.Text>{label}</Typography.Text>
      </Flex>
    ),
    key: itemValue,
    'data-testid': `menu-item-${itemValue}`,
    onClick: () => onChangeProperty?.(itemValue),
  }));

  return (
    <Space.Compact>
      <Input
        value={searchValue}
        onChange={(e) => onChangeSearchValue?.(e.target.value)}
        prefix={<SearchOutlined />}
        placeholder={placeholder}
        className={styles.input}
        data-testid="search-input"
      />
      {options.length > 1 && (
        <Dropdown
          disabled={!options.length}
          open={open}
          onOpenChange={setOpen}
          trigger={['click']}
          menu={{ items, className: 'search-dropdown-menu' }}
          placement="bottomRight"
        >
          <Button
            icon={<SettingOutlined />}
            data-testid="search-dropdown-button"
          />
        </Dropdown>
      )}
    </Space.Compact>
  );
};
