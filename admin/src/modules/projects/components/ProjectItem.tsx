import { Avatar, Tag, Typography } from 'antd';
import { css } from '@emotion/react';
import { Flex } from '@components/utility/Flex';
import { routes } from '@modules/router/routes';
import { ShopIcon } from '@src/layouts/app/components/StoreMenu/shop-icon/ShopIcon';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IStoreItemProps {
  name: string;
  slug: string;
  active: boolean;
  onClick?: () => void;
  color?: string;
}

export const ProjectItem = ({
  color,
  active,
  slug,
  name,
}: IStoreItemProps) => {
  const { formatMessage } = useIntl();
  const backgroundColor = active
    ? `var(--color-${color}-2)`
    : 'var(--color-gray-4)';

  const onClick = () => {
    if (!active) {
      return;
    }

    location.assign(routes.store.getUrl(slug));
  };

  return (
    <Flex
      as="button"
      onClick={onClick}
      px="4"
      py="4"
      justify="space-between"
      align="center"
      data-testid="project-item"
      css={css`
        cursor: ${active ? 'pointer' : 'not-allowed'};
        text-align: left;
        background-color: var(--color-gray-1);
        transition: all 0.2s ease-in-out;

        &:hover {
          background-color: var(--color-gray-2);
          border: 1px solid var(--color-border);
        }

        border: 1px solid var(--color-border);
        width: 100%;
        border-radius: var(--radius-base);
      `}
    >
      <Flex gap="4">
        <Avatar
          size="large"
          css={css`
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: ${backgroundColor};
          `}
        >
          <Flex align="center" justify="center">
            <ShopIcon
              color={`var(--color-${active ? color : 'gray'}-6)`}
              size={24}
            />
          </Flex>
        </Avatar>
        <Flex direction="column">
          <Typography.Text strong>{name}</Typography.Text>
          <Typography.Text
            css={css`
              margin-top: calc(-1 * var(--x1));
              color: var(--color-gray-7);
            `}
          >
            {slug}
          </Typography.Text>
        </Flex>
      </Flex>
      {active && (
        <Tag color="green" data-testid="project-badge-active">
          {formatMessage({ id: t('projects.badge.active') })}
        </Tag>
      )}
    </Flex>
  );
};
