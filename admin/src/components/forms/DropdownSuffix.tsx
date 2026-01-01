import { Dropdown, Typography } from 'antd';
import { MdKeyboardArrowDown } from 'react-icons/md';
import { Flex } from '@components/utility/Flex';
import { ReactNode } from 'react';

interface IDropdownSuffixItem<T extends string> {
  key: T;
  label: ReactNode;
  icon?: ReactNode;
}

interface IDropdownSuffixProps<T extends string> {
  items: IDropdownSuffixItem<T>[];
  selectedKey?: T | null;
  placeholder?: string;
  onSelect: (key: T) => void;
  /**
   * If true, stopPropagation will be called on menu select domEvent
   * useful when dropdown is rendered inside Input suffix
   */
  stopPropagation?: boolean;
}

export const DropdownSuffix = <T extends string>({
  items,
  selectedKey,
  placeholder = 'Select',
  onSelect,
  stopPropagation = false,
}: IDropdownSuffixProps<T>) => {
  const selectedItem = items.find((it) => it.key === selectedKey);
  const { label, icon } = selectedItem || {};
  return (
    <Dropdown
      placement="bottomRight"
      trigger={['click']}
      menu={{
        items,
        selectable: true,
        selectedKeys: selectedKey ? [selectedKey] : [],
        onSelect: ({ key, domEvent }) => {
          if (stopPropagation) {
            domEvent.stopPropagation();
          }
          onSelect(key as T);
        },
      }}
    >
      <Flex
        align="center"
        gap="1"
        style={{
          opacity: 0.7,
          cursor: 'pointer',
        }}
      >
        {icon}
        <Typography.Text
          // type="secondary"
          style={{
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          {label || placeholder}
        </Typography.Text>
        <MdKeyboardArrowDown color="var(--color-gray-6)" />
      </Flex>
    </Dropdown>
  );
};
