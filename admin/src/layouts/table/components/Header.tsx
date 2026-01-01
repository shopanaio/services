import { createStyles } from 'antd-style';
import { PlusOutlined } from '@ant-design/icons';
import { Badge, Button, ButtonProps, Flex, Typography } from 'antd';
import { ReactNode } from 'react';

const useStyles = createStyles({
  title: {
    paddingRight: 'var(--x3)',
  },
});

export interface ITableLayoutHeaderProps {
  count?: number;
  title?: string;
  create?: () => void;
  createButtonProps?: ButtonProps;
  loading?: boolean;
  extra?: ReactNode;
  createLabel?: string;
  /** @deprecated use createButtonProps */
  createDisabled?: boolean;
}

export const TableLayoutHeader = ({
  count = 0,
  title,
  create,
  createDisabled,
  extra = null,
  createButtonProps,
  createLabel = 'Create',
}: ITableLayoutHeaderProps) => {
  const { styles } = useStyles();

  return (
    <Flex style={{ height: 32 }} justify="space-between" align="center">
      <Badge
        data-testid="page-title-wrapper"
        data-count={count}
        color="var(--color-primary-10)"
        count={count}
        overflowCount={9999}
        offset={[count > 9 ? 6 : 0, 5]}
      >
        <Typography.Title
          data-testid="page-title"
          level={4}
          className={styles.title}
        >
          {title}
        </Typography.Title>
      </Badge>
      {create && (
        <Flex gap="middle" align="center">
          {extra}
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={create}
            disabled={createDisabled}
            data-testid="create-button"
            {...createButtonProps}
          >
            {createLabel}
          </Button>
        </Flex>
      )}
    </Flex>
  );
};
