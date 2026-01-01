import { createStyles } from 'antd-style';
import { SettingOutlined } from '@ant-design/icons';
import { Button, Checkbox, Dropdown, Flex, Typography, theme } from 'antd';
import { ReactElement, cloneElement, CSSProperties } from 'react';

const useStyles = createStyles({
  paper: {
    minWidth: 250,
    background: 'var(--color-bg-container)',
    borderRadius: 'var(--radius-base)',
  },
  title: {
    fontSize: 'var(--font-size-md)',
  },
});

interface ColumnOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface ColumnValue {
  value: string;
  active: boolean;
}

export interface IColumnsProps {
  value: ColumnValue[];
  onChange: (value: ColumnValue[]) => void;
  options: ColumnOption[];
  reset?: () => void;
  title?: string;
}

export const Columns = ({
  value = [],
  options = [],
  onChange: onChangeProp,
  title = 'Columns',
}: IColumnsProps) => {
  const { styles } = useStyles();
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
        <Flex gap="small">
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
  }).filter(Boolean);

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
        <div className={styles.paper} style={{ boxShadow: token.boxShadow }}>
          <Flex style={{ paddingTop: 'var(--x2)', paddingLeft: 'var(--x4)', paddingRight: 'var(--x4)' }}>
            <Typography.Text data-testid="columns-title" strong className={styles.title}>
              {title}
            </Typography.Text>
          </Flex>
          {cloneElement(menu as ReactElement<{ style?: CSSProperties }>, {
            style: { boxShadow: 'none' },
          })}
        </div>
      )}
    >
      <Button
        size="small"
        type="text"
        data-testid="columns-dropdown-button"
        icon={<SettingOutlined />}
      />
    </Dropdown>
  );
};
