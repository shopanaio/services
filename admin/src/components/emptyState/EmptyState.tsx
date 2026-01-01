import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { Typography } from 'antd';

import Lottie from 'lottie-react';

export interface IEmptyStateProps {
  lottie?: any;
  imageSrc?: string;
  'data-testid'?: string;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  height?: string;
}

export const EmptyState = ({
  lottie,
  imageSrc,
  title,
  footer,
  subtitle,
  'data-testid': dataTestId,
}: IEmptyStateProps) => {
  return (
    <Flex
      direction="column"
      justify="center"
      gap="10"
      align="center"
      data-testid={dataTestId}
    >
      <Box w="124px" h="100px" className="empty-state-image">
        {lottie ? (
          <Lottie animationData={lottie} loop={true} />
        ) : (
          <img
            src={imageSrc}
            alt=""
            width="160"
            height="160"
            css={css`
              width: 100%;
              height: 100%;
            `}
          />
        )}
      </Box>
      <Flex
        direction="column"
        css={css`
          text-align: center;
        `}
      >
        <Typography.Paragraph strong>{title}</Typography.Paragraph>
        {subtitle && (
          <Typography.Text
            type="secondary"
            css={css`
              margin-top: calc(var(--x2) * -1);
            `}
          >
            {subtitle}
          </Typography.Text>
        )}
        {footer}
      </Flex>
    </Flex>
  );
};
