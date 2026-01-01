import { css } from '@emotion/react';

const s = {
  container: css`
    background-color: var(--bg-gradient);
    width: 100vw;
    min-height: 100vh;
  `,
};

export const ProjectsLayoutFallback = () => {
  return <div css={s.container} />;
};
