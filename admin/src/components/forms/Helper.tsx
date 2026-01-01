import { css } from '@emotion/react';

import { ReactNode } from 'react';

import { Typography } from 'antd';

const { Text } = Typography;

export const Helper = ({
  children,
  lazy = true,
  'data-testid': dataTestId,
}: {
  children: ReactNode;
  lazy?: boolean;
  'data-testid'?: string;
}) => {
  if (lazy && !children) {
    return null;
  }

  return (
    <div
      css={css`
        height: var(--x2);
        padding-top: var(--x1);
      `}
    >
      <Text
        data-testid={dataTestId}
        type="danger"
        css={css`
          opacity: ${children ? 1 : 0};
          transition: opacity 0.2s ease-in-out;
        `}
      >
        {children}
      </Text>
    </div>
  );
};
