import { css } from '@emotion/react';

export const buttonHoverCss = css`
  & svg {
    transition: color 0.1s ease;
  }

  &:hover svg {
    color: black;
  }
`;

export const buttonActiveHoverCss = css`
  & svg {
    transition: color 0.1s ease;
    color: var(--color-primary);
  }

  &:hover svg {
    color: var(--color-primary);
  }
`;

export const leftButtonCss = css`
  & svg {
    transition: color 0.1s ease;
  }

  &:hover svg {
    color: black;
  }

  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
`;

export const rightButtonCss = css`
  & svg {
    transition: color 0.1s ease;
  }

  &:hover svg {
    color: black;
  }

  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
  border-left: none;
`;

export const centerButtonCss = css`
  border-radius: 0 !important;
  border-left: none;
`;

export const s = {
  editor: css`
    --border-color: var(--color-gray-3);

    cursor: text;
    box-sizing: border-box;
    min-height: 200px;
    padding-bottom: var(--x2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    transition: all 0.3s ease;
    box-shadow: var(--shadow-primary-0);
    position: relative;
    background-color: var(--bg-color);
    outline: 4px solid transparent;

    &:focus-within {
      outline-color: var(--color-gray-4);
      border-color: var(--color-primary-10);
    }

    &:hover:not(:focus-within) {
      border-color: var(--color-border);
    }

    & .ql-container {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-regular);

      /* font-size */

      & .font-size-xxs {
        font-size: var(--font-size-xs);
      }

      & .font-size-xs {
        font-size: var(--font-size-xs);
      }

      & .font-size-s {
        font-size: var(--font-size-s);
      }

      & .font-size-m {
        font-size: var(--font-size-m);
      }

      & .font-size-l {
        font-size: var(--font-size-l);
      }

      & .font-size-xl {
        font-size: var(--font-size-xl);
      }

      & .font-size-xxl {
        font-size: var(--font-size-xxl);
      }

      /* font-weight */

      & .font-weight-regular {
        font-weight: var(--font-weight-regular);
      }

      & .font-weight-medium {
        font-weight: var(--font-weight-medium);
      }

      & .font-weight-semibold {
        font-weight: var(--font-weight-semibold);
      }

      & .font-weight-bold {
        font-weight: var(--font-weight-bold);
      }
    }
  `,
  flex: css`
    display: flex;
  `,
  toolbar: css`
    display: flex;
    gap: var(--size-2);
    align-items: center;
    position: sticky;
    top: 0;
    gap: var(--x4);
    background-color: var(--color-gray-1);
    padding: var(--x1) var(--x1) 0;
    transition: background-color 0.2s ease;
    z-index: 1;
  `,
  toolbarSelect: css`
    width: 120px !important;
    border-bottom: 1px solid var(--color-gray-4) !important;
    box-shadow: none;
    padding-right: var(--x1);
    &:hover {
      box-shadow: none;
    }
  `,
};
