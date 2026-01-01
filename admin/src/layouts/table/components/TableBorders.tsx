import { css } from '@emotion/react';

export const TableTopBorder = () => {
  return (
    <div
      css={css`
        position: sticky;
        top: 64px;
        background: var(--bg-gradient);
        z-index: 100;
        padding: 0;
        margin-left: 0;
        width: 100%;
        margin-bottom: calc(-1 * var(--x2));
        pointer-events: none;
      `}
    >
      <div
        css={css`
          background-color: var(--color-gray-1);
          height: var(--x2);
          border-top-left-radius: var(--radius-base);
          border-top-right-radius: var(--radius-base);
          border: 1px solid var(--color-border);
          border-bottom: none;
        `}
      />
    </div>
  );
};

export const TableBottomBorder = ({ bottom = 48 }: { bottom?: number }) => {
  return (
    <div
      css={css`
        position: sticky;
        bottom: ${bottom}px;
        background: var(--bg-gradient);
        z-index: 100;
        padding: 0 0 var(--x2);
        margin-left: 0;
        width: 100%;
      `}
    >
      <div
        css={css`
          background-color: var(--color-gray-1);
          height: var(--x2);
          border-bottom-left-radius: var(--radius-base);
          border-bottom-right-radius: var(--radius-base);
          border: 1px solid var(--color-border);
          border-top: none;
        `}
      />
    </div>
  );
};
