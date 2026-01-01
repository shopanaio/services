import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { Badge, Typography } from 'antd';
import { ReactNode } from 'react';

export interface IDrawerPaperProps {
  title: ReactNode;
  extra?: React.ReactNode;
  badgeCount?: number;
  name: string;
  showZero?: boolean;
}

export const DrawerPaperHeader = ({
  title,
  extra,
  badgeCount,
  name,
  showZero = true,
}: IDrawerPaperProps) => {
  const renderTitle = () => {
    if (typeof title === 'string') {
      let t = (
        <Typography.Text
          strong
          css={css`
            font-size: 15px;
            padding-right: var(--x3);
          `}
        >
          {title}
        </Typography.Text>
      );

      if (typeof badgeCount === 'number') {
        t = (
          <Badge
            count={badgeCount}
            showZero={showZero}
            data-testid={`${name}-count-badge`}
            data-count={badgeCount}
            color="var(--color-primary-10)"
            overflowCount={9999}
            offset={[badgeCount > 9 ? 6 : 0, 5]}
          >
            {t}
          </Badge>
        );
      }

      return <Box w="100%">{t}</Box>;
    }

    return title;
  };

  return (
    <Flex
      h="32px"
      align="center"
      justify="space-between"
      data-testid={`${name || 'needs-fix'}-header`}
      css={css`
        &:not(:last-child) {
          margin-bottom: var(--x4);
        }
      `}
    >
      {renderTitle()}
      {extra}
    </Flex>
  );
};
