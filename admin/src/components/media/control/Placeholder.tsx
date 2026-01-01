import { Box } from '@/components/utility/Box';
import { css } from '@emotion/react';

export const MediaFilePlaceholder = () => {
  return (
    <Box
      css={css`
        opacity: 0.5;
        cursor: default;
        aspect-ratio: 1/1;
        width: 100%;
        border-radius: var(--radius-base);
        border: 1px dashed var(--color-primary-7);
        background-color: var(--color-primary-2);
        transition: all 0.2s ease-in-out;
      `}
    ></Box>
  );
};
