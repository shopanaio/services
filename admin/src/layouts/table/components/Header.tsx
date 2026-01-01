import { getIconProps } from '@components/styles';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { Badge, Button, ButtonProps, Typography } from 'antd';
import { MdAdd } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export interface ITableLayoutHeaderProps {
  count?: number;
  title?: string;
  create?: () => void;
  createButtonProps?: ButtonProps;
  loading?: boolean;
  extra?: React.ReactNode;
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
}: ITableLayoutHeaderProps) => {
  const { formatMessage } = useIntl();
  return (
    <Flex h="32px" justify="space-between" align="center">
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
          css={css`
            padding-right: var(--x3);
          `}
        >
          {title}
        </Typography.Title>
      </Badge>
      {create && (
        <Flex gap="4" align="center">
          {extra}
          <Button
            icon={<MdAdd {...getIconProps(18)} />}
            type="primary"
            onClick={create}
            disabled={createDisabled}
            data-testid="create-button"
            children={formatMessage({ id: t('layouts.common.create') })}
            {...createButtonProps}
          />
        </Flex>
      )}
    </Flex>
  );
};
