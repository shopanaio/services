import { SortAscendingOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Button, Dropdown, Flex, Radio, Typography } from 'antd';
import { useState } from 'react';

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface ISortByValue {
  property: string;
  direction: SortDirection;
}

export const getTableDirection = (key: string, v: ISortByValue) => {
  if (key === v.property) {
    if (v.direction === SortDirection.ASC) {
      return 'ascend' as const;
    }
    if (v.direction === SortDirection.DESC) {
      return 'descend' as const;
    }
  }

  return null;
};

export const getApiSort = (value: ISortByValue) => {
  const { property, direction } = value;
  return `${property}${direction}`;
};

interface SortOption {
  label: string;
  value: string;
}

export interface ISortByProps {
  value: ISortByValue;
  onChangeProperty: (value: string) => void;
  onChangeDirection: (value: SortDirection) => void;
  options: SortOption[];
  onChange?: (value: ISortByValue) => void;
  reset?: () => void;
  label?: string;
  ascLabel?: string;
  descLabel?: string;
}

export const SortBy = ({
  value = {
    property: '',
    direction: SortDirection.ASC,
  },
  options = [],
  onChangeDirection,
  onChangeProperty,
  label = 'Sort by',
  ascLabel = 'Asc',
  descLabel = 'Desc',
}: ISortByProps) => {
  const [open, setOpen] = useState(false);

  const items = options.map(({ label, value: itemValue }) => {
    const onClick = () => {
      onChangeProperty(itemValue);
    };

    return {
      label: (
        <Flex>
          <Radio
            data-testid={`sort-radio-${itemValue}`}
            checked={itemValue === value.property}
          />
          <Typography.Text>{label}</Typography.Text>
        </Flex>
      ),
      key: itemValue,
      'data-testid': `sort-item-${itemValue}`,
      onClick,
    };
  });

  const orderItems = [
    { type: 'divider' as const },
    {
      onClick: () => onChangeDirection(SortDirection.ASC),
      label: (
        <Flex align="center" gap="middle">
          <ArrowUpOutlined />
          <Typography.Text>{ascLabel}</Typography.Text>
        </Flex>
      ),
      key: SortDirection.ASC,
      'data-testid': 'sort-item-asc',
      'data-selected': value.direction === SortDirection.ASC,
    },
    {
      label: (
        <Flex align="center" gap="middle">
          <ArrowDownOutlined />
          <Typography.Text>{descLabel}</Typography.Text>
        </Flex>
      ),
      onClick: () => onChangeDirection(SortDirection.DESC),
      key: SortDirection.DESC,
      'data-testid': 'sort-item-desc',
      'data-selected': value.direction === SortDirection.DESC,
    },
  ];

  return (
    <Dropdown
      disabled={!options.length}
      trigger={['click']}
      menu={{
        selectable: true,
        selectedKeys: [value.direction],
        style: { minWidth: 150 },
        items: [...items, ...orderItems],
      }}
      open={open}
      onOpenChange={setOpen}
    >
      <Button
        data-testid="sort-dropdown-button"
        icon={<SortAscendingOutlined />}
      >
        {label}
      </Button>
    </Dropdown>
  );
};
