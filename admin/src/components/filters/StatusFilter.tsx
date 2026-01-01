import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { IDropdownOption } from '@src/types';
import { cropString } from '@src/utils/utils';
import { Button, Checkbox, Dropdown, Typography, theme } from 'antd';
import { CSSProperties, ReactElement, cloneElement, useState } from 'react';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { HiChevronDown } from 'react-icons/hi';

export interface IStatusProps {
  name?: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: IDropdownOption[];
  reset: () => void;
}

export const StatusFilter = ({
  name = 'Status',
  value = [],
  options,
  onChange: onChangeProp,
}: IStatusProps) => {
  const [open, setOpen] = useState(false);
  const intl = useIntl();

  const { token } = theme.useToken();

  const contentStyle: CSSProperties = {
    backgroundColor: token.colorBgElevated,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowSecondary,
    minWidth: 180,
  };

  const menuStyle: CSSProperties = {
    boxShadow: 'none',
  };

  const renderLabel = () => {
    if (value.length === 0) {
      return intl.formatMessage({ id: t('common.status') });
    }

    if (value.length === 1) {
      const status = options.find(({ value: v }) => v === value[0]);
      return status?.label;
    }

    if (value.length === options.length) {
      return intl.formatMessage({ id: t('common.all') });
    }

    return cropString(
      options
        .filter((it) => value.includes(it.value))
        .map((it) => it.label)
        .join(', '),
      24,
    );
  };

  const items = options.map(({ label, value: itemValue }) => {
    const checked = value.includes(itemValue);
    const disabled = checked && value.length === 1;

    const onClick = () => {
      if (disabled) {
        return;
      }

      onChangeProp(
        checked ? value.filter((v) => v !== itemValue) : [...value, itemValue],
      );
    };

    return {
      label: (
        <Flex gap="2">
          <Checkbox
            data-testid={`status-checkbox-${itemValue}`}
            checked={checked}
            disabled={disabled}
          />
          <Typography.Text>{label}</Typography.Text>
        </Flex>
      ),
      key: itemValue,
      'data-testid': `status-item-${itemValue}`,
      onClick,
    };
  });

  return (
    <Dropdown
      disabled={!options.length}
      trigger={['click']}
      menu={{ items }}
      open={open}
      dropdownRender={(menu) => {
        return (
          <div style={contentStyle}>
            <Flex px="4" pt="2">
              <Typography.Text type="secondary">{name}</Typography.Text>
            </Flex>

            {cloneElement(menu as ReactElement, { style: menuStyle })}
          </div>
        );
      }}
      onOpenChange={setOpen}
    >
      <Box minW="100px">
        <Button
          block
          disabled={!options.length}
          data-testid="status-dropdown-button"
        >
          <Flex justify="space-between">
            {renderLabel()}
            <HiChevronDown
              size={16}
              css={css`
                transform: translate(6px, 3px);
              `}
            />
          </Flex>
        </Button>
      </Box>
    </Dropdown>
  );
};
