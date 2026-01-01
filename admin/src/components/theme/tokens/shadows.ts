import { css } from '@emotion/react';

export const shadows = css`
  :root {
    --box-shadow-control: 0 0 1px 4px var(--color-primary-5);

    --box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08),
      0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05);

    --box-shadow-secondary: 0 6px 16px 0 rgba(0, 0, 0, 0.08),
      0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05);

    --box-shadow-tertiary: 0 1px 2px 0 rgba(0, 0, 0, 0.03),
      0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02);

    --box-shadow-popover-arrow: 2px 2px 5px rgba(0, 0, 0, 0.05);

    --box-shadow-card: 0 1px 2px -2px rgba(0, 0, 0, 0.16),
      0 3px 6px 0 rgba(0, 0, 0, 0.12), 0 5px 12px 4px rgba(0, 0, 0, 0.09);

    --box-shadow-drawer-right: -6px 0 16px 0 rgba(0, 0, 0, 0.08),
      -3px 0 6px -4px rgba(0, 0, 0, 0.12), -9px 0 28px 8px rgba(0, 0, 0, 0.05);

    --box-shadow-drawer-left: 6px 0 16px 0 rgba(0, 0, 0, 0.08),
      3px 0 6px -4px rgba(0, 0, 0, 0.12), 9px 0 28px 8px rgba(0, 0, 0, 0.05);

    --box-shadow-drawer-up: 0 6px 16px 0 rgba(0, 0, 0, 0.08),
      0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05);

    --box-shadow-drawer-down: 0 -6px 16px 0 rgba(0, 0, 0, 0.08),
      0 -3px 6px -4px rgba(0, 0, 0, 0.12), 0 -9px 28px 8px rgba(0, 0, 0, 0.05);

    --ds-shadow-border: 0 0 0 1px rgba(0, 0, 0, 0.08);

    /* Vercel */
    --box-shadow-modal: var(--ds-shadow-border), 0px 1px 1px rgba(0, 0, 0, 0.02),
      0px 8px 16px -4px rgba(0, 0, 0, 0.04),
      0px 24px 32px -8px rgba(0, 0, 0, 0.06);

    --box-shadow-menu: var(--ds-shadow-border), 0px 1px 1px rgba(0, 0, 0, 0.02),
      0px 4px 8px -4px rgba(0, 0, 0, 0.04),
      0px 16px 24px -8px rgba(0, 0, 0, 0.06);

    --box-shadow-paper: var(--ds-shadow-border),
      0px 1px 3px 0 rgba(0, 0, 0, 0.05);

    --shadow-small: 0px 2px 2px rgba(0, 0, 0, 0.04);
  }
`;
