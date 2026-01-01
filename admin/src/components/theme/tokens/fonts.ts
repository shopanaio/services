import { css } from '@emotion/react';

export const ROOT_FONT_SIZE = 14;
export const fonts = css`
  :root {
    /* font-family */
    --font-family-heading: 'Inter', Trebuchet MS, sans-serif;
    --font-family-base: 'Inter', Trebuchet MS, serif;
    /* Update <html /> font size */
    font-size: ${ROOT_FONT_SIZE}px;
    /* Default font-size in px */
    --font-size: ${ROOT_FONT_SIZE}px;
    /* Default font-size in rem */
    --font-size-rem: 1rem;
    /* 10px, 12px, */
    --font-size-heading-1: 38px;
    --font-size-heading-2: 30px;
    --font-size-heading-3: 24px;
    --font-size-heading-4: 20px;
    --font-size-heading-5: 16px;

    --font-size-xs: 12px;
    --font-size-md: 16px;

    /* font-weight  */
    --font-weight-strong: 500;
    --font-weight-bold: 700;
    --font-weight-base: 400;
    --font-weight-light: 300;
  }
`;
