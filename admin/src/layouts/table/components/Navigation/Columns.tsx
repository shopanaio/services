import { Paper } from '@components/paper/Paper';
import { iconProps } from '@components/styles';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { IDropdownOption } from '@src/types';
import { Button, Checkbox, Dropdown, Typography, theme } from 'antd';
import { ReactElement, cloneElement } from 'react';
import { CgOptions } from 'react-icons/cg';

export interface IColumnsProps {
  value: { value: string; active: boolean }[];
  onChange: (value: { value: string; active: boolean }[]) => void;
  options: IDropdownOption[];
  reset: () => void;
}

export const Columns = ({
  value = [],
  options = [],
  onChange: onChangeProp,
}: IColumnsProps) => {
  const { token } = theme.useToken();

  const items = options.map(({ label, value: itemValue, disabled }) => {
    const current = value.find((v) => v.value === itemValue);
    if (!current) {
      return null;
    }

    const onClick = () => {
      if (disabled) {
        return;
      }

      onChangeProp(
        value.map((v) =>
          itemValue === v.value
            ? {
                ...v,
                active: !v.active,
              }
            : v,
        ),
      );
    };

    return {
      label: (
        <Flex gap="2">
          <Checkbox
            data-testid={`columns-checkbox-${itemValue}`}
            checked={current.active}
            disabled={disabled}
          />
          <Typography.Text>{label}</Typography.Text>
        </Flex>
      ),
      key: itemValue,
      onClick,
      'data-testid': `columns-item-${itemValue}`,
    };
  });

  return (
    <Dropdown
      disabled={!value.length}
      trigger={['click']}
      menu={{
        items,
        style: { minWidth: 250 },
        selectable: true,
        selectedKeys: value.filter((v) => v.active).map((v) => v.value),
        multiple: true,
      }}
      dropdownRender={(menu) => (
        <Paper
          css={css`
            min-width: 250px;
            box-shadow: ${token.boxShadow};
          `}
        >
          <Flex pt="2" px="4">
            <Typography.Text
              data-testid="columns-title"
              strong
              css={css`
                font-size: var(--font-size-md);
              `}
            >
              Columns
            </Typography.Text>
          </Flex>
          {cloneElement(menu as ReactElement, {
            style: { boxShadow: 'none' },
          })}
        </Paper>
      )}
    >
      <Button
        size="small"
        type="text"
        data-testid="columns-dropdown-button"
        icon={<CgOptions   />}
      />
    </Dropdown>
  );
};
