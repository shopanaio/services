import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { IDropdownOption } from '@src/types';
import { Button, Dropdown, Radio, Typography } from 'antd';
import { useState } from 'react';
import {
  MdArrowDownward,
  MdArrowUpward,
  MdOutlineSortByAlpha,
} from 'react-icons/md';

const iconProps = {
  size: 14,
  css: css`
    transform: translateY(2px);
  `,
};

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
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

export interface ISortByValue {
  property: string;
  direction: SortDirection;
}

export interface ISortByProps {
  value: ISortByValue;
  onChangeProperty: (value: string) => void;
  onChangeDirection: (value: SortDirection) => void;
  options: IDropdownOption[];
  onChange: (value: ISortByValue) => void;
  reset: () => void;
}

export const getApiSort = (value: ISortByValue) => {
  const { property, direction } = value;

  return `${property}${direction}`;
};

export const SortBy = ({
  value = {
    property: '',
    direction: SortDirection.ASC,
  },
  options = [],
  onChangeDirection,
  onChangeProperty,
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
    { type: 'divider' },
    {
      onClick: () => onChangeDirection(SortDirection.ASC),
      label: (
        <Flex align="center" gap="3">
          <MdArrowUpward />
          <Typography.Text>Asc</Typography.Text>
        </Flex>
      ),
      key: SortDirection.ASC,
      'data-testid': 'sort-item-asc',
      'data-selected': value.direction === SortDirection.ASC,
    },
    {
      label: (
        <Flex align="center" gap="3">
          <MdArrowDownward />
          <Typography.Text>Desc</Typography.Text>
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
        // @ts-expect-error not typed
        items: [...items, ...orderItems],
      }}
      open={open}
      onOpenChange={setOpen}
    >
      <Button
        data-testid="sort-dropdown-button"
        icon={<MdOutlineSortByAlpha   />}
      >
        Sort by
      </Button>
    </Dropdown>
  );
};
