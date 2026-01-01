import { css } from '@emotion/react';

const s = {
  container: css`
    background-color: var(--color-gray-4);
    width: 100vw;
    min-height: 100vh;
  `,
};

export const AccountLayoutFallback = () => {
  return <div css={s.container} />;
};
