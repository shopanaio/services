"use client";

import { createGlobalStyle } from "antd-style";

export const GlobalStyle = createGlobalStyle`
  html {
    background-color: var(--ant-color-bg-base);
    font-size: 14px;
  }

  * {
    -webkit-tap-highlight-color: transparent;
  }

  :root {
    --sticky-header-height: 64px;

    /* Spacing variables */
    --x1: 4px;
    --x2: 8px;
    --x3: 12px;
    --x4: 16px;
    --x5: 20px;
    --x6: 24px;
    --x7: 28px;
    --x8: 32px;
    --x9: 36px;
    --x10: 40px;
    --x11: 44px;
    --x12: 48px;
    --x13: 52px;
    --x14: 56px;
    --x15: 60px;
    --x16: 64px;
    --x17: 68px;
    --x18: 72px;
    --x19: 76px;
    --x20: 80px;
    --x21: 84px;
    --x22: 88px;
    --x23: 92px;
    --x24: 96px;
    --x25: 100px;

    /* Background gradients */
    --bg-gradient: linear-gradient(
      90deg,
      hsl(255, 70%, 100%) 0%,
      hsl(217, 70%, 100%) 50%,
      hsl(210, 70%, 100%) 100%
    );

    --bg-gradient-accent: linear-gradient(
      90deg,
      hsl(255, 80%, 98%) 0%,
      hsl(217, 80%, 98%) 50%,
      hsl(210, 80%, 98%) 100%
    );

    /* Primary colors */
    --color-primary: var(--color-gray-10);
    --color-text: var(--color-gray-9);
    --color-border: #d9d9d9;
    --color-bg-container: #ffffff;

    --color-primary-1: var(--color-gray-1);
    --color-primary-2: var(--color-gray-2);
    --color-primary-3: var(--color-gray-3);
    --color-primary-4: var(--color-gray-4);
    --color-primary-5: var(--color-gray-5);
    --color-primary-6: var(--color-gray-6);
    --color-primary-7: var(--color-gray-7);
    --color-primary-8: var(--color-gray-8);
    --color-primary-9: var(--color-gray-9);
    --color-primary-10: var(--color-gray-12);

    /* Gray colors */
    --color-gray-1: #ffffff;
    --color-gray-2: #fafafa;
    --color-gray-3: #f2f2f2;
    --color-gray-4: #ebebeb;
    --color-gray-5: #e6e6e6;
    --color-gray-6: #bfbfbf;
    --color-gray-7: #8c8c8c;
    --color-gray-8: #595959;
    --color-gray-9: #434343;
    --color-gray-10: #262626;
    --color-gray-11: #1f1f1f;
    --color-gray-12: #141414;
    --color-gray-13: #000;

    /* Blue colors */
    --color-blue-1: #e6f4ff;
    --color-blue-2: #bae0ff;
    --color-blue-3: #91caff;
    --color-blue-4: #69b1ff;
    --color-blue-5: #4096ff;
    --color-blue-6: #1677ff;
    --color-blue-7: #0958d9;
    --color-blue-8: #003eb3;
    --color-blue-9: #002c8c;
    --color-blue-10: #001d66;

    /* Cyan colors */
    --color-cyan-1: #e6fffb;
    --color-cyan-2: #b5f5ec;
    --color-cyan-3: #87e8de;
    --color-cyan-4: #5cdbd3;
    --color-cyan-5: #36cfc9;
    --color-cyan-6: #13c2c2;
    --color-cyan-7: #08979c;
    --color-cyan-8: #006d75;
    --color-cyan-9: #00474f;
    --color-cyan-10: #002329;

    /* Green colors */
    --color-green-1: #f6ffed;
    --color-green-2: #d9f7be;
    --color-green-3: #b7eb8f;
    --color-green-4: #95de64;
    --color-green-5: #73d13d;
    --color-green-6: #52c41a;
    --color-green-7: #389e0d;
    --color-green-8: #237804;
    --color-green-9: #135200;
    --color-green-10: #092b00;

    /* Red colors */
    --color-red-1: #fff1f0;
    --color-red-2: #ffccc7;
    --color-red-3: #ffa39e;
    --color-red-4: #ff7875;
    --color-red-5: #ff4d4f;
    --color-red-6: #f5222d;
    --color-red-7: #cf1322;
    --color-red-8: #a8071a;
    --color-red-9: #820014;
    --color-red-10: #5c0011;

    /* Volcano colors */
    --color-volcano-1: #fff2e8;
    --color-volcano-2: #ffd8bf;
    --color-volcano-3: #ffbb96;
    --color-volcano-4: #ff9c6e;
    --color-volcano-5: #ff7a45;
    --color-volcano-6: #fa541c;
    --color-volcano-7: #d4380d;
    --color-volcano-8: #ad2102;
    --color-volcano-9: #871400;
    --color-volcano-10: #610b00;

    /* Orange colors */
    --color-orange-1: #fff7e6;
    --color-orange-2: #ffe7ba;
    --color-orange-3: #ffd591;
    --color-orange-4: #ffc069;
    --color-orange-5: #ffa940;
    --color-orange-6: #fa8c16;
    --color-orange-7: #d46b08;
    --color-orange-8: #ad4e00;
    --color-orange-9: #873800;
    --color-orange-10: #612500;

    /* Gold colors */
    --color-gold-1: #fffbe6;
    --color-gold-2: #fff1b8;
    --color-gold-3: #ffe58f;
    --color-gold-4: #ffd666;
    --color-gold-5: #ffc53d;
    --color-gold-6: #faad14;
    --color-gold-7: #d48806;
    --color-gold-8: #ad6800;
    --color-gold-9: #874d00;
    --color-gold-10: #613400;

    /* Yellow colors */
    --color-yellow-1: #feffe6;
    --color-yellow-2: #ffffb8;
    --color-yellow-3: #fffb8f;
    --color-yellow-4: #fff566;
    --color-yellow-5: #ffec3d;
    --color-yellow-6: #fadb14;
    --color-yellow-7: #d4b106;
    --color-yellow-8: #ad8b00;
    --color-yellow-9: #876800;
    --color-yellow-10: #614700;

    /* Lime colors */
    --color-lime-1: #fcffe6;
    --color-lime-2: #f4ffb8;
    --color-lime-3: #eaff8f;
    --color-lime-4: #d3f261;
    --color-lime-5: #bae637;
    --color-lime-6: #a0d911;
    --color-lime-7: #7cb305;
    --color-lime-8: #5b8c00;
    --color-lime-9: #3f6600;
    --color-lime-10: #254000;

    /* Purple colors */
    --color-purple-1: #f9f0ff;
    --color-purple-2: #efdbff;
    --color-purple-3: #d3adf7;
    --color-purple-4: #b37feb;
    --color-purple-5: #9254de;
    --color-purple-6: #722ed1;
    --color-purple-7: #531dab;
    --color-purple-8: #391085;
    --color-purple-9: #22075e;
    --color-purple-10: #120338;

    /* Magenta colors */
    --color-magenta-1: #fff0f6;
    --color-magenta-2: #ffd6e7;
    --color-magenta-3: #ffadd2;
    --color-magenta-4: #ff85c0;
    --color-magenta-5: #f759ab;
    --color-magenta-6: #eb2f96;
    --color-magenta-7: #c41d7f;
    --color-magenta-8: #9e1068;
    --color-magenta-9: #780650;
    --color-magenta-10: #520339;

    /* Geekblue colors */
    --color-geekblue-1: var(--color-gray-2);
    --color-geekblue-2: var(--color-gray-3);
    --color-geekblue-3: var(--color-gray-4);
    --color-geekblue-4: var(--color-gray-5);
    --color-geekblue-5: var(--color-gray-6);
    --color-geekblue-6: var(--color-gray-7);
    --color-geekblue-7: var(--color-gray-8);
    --color-geekblue-8: var(--color-gray-9);
    --color-geekblue-9: var(--color-gray-10);
    --color-geekblue-muted: #6670e6;

    /* Font families */
    --font-family-heading: 'Inter', Trebuchet MS, sans-serif;
    --font-family-base: 'Inter', Trebuchet MS, serif;

    /* Font sizes */
    --font-size: 14px;
    --font-size-rem: 1rem;
    --font-size-heading-1: 38px;
    --font-size-heading-2: 30px;
    --font-size-heading-3: 24px;
    --font-size-heading-4: 20px;
    --font-size-heading-5: 16px;
    --font-size-xs: 12px;
    --font-size-sm: 14px;
    --font-size-md: 16px;

    /* Font weights */
    --font-weight-strong: 500;
    --font-weight-bold: 700;
    --font-weight-base: 400;
    --font-weight-light: 300;

    /* Border radius */
    --radius-base: 6px;

    /* Transitions */
    --timing-fn-quad: cubic-bezier(0, 0.9, 0.77, 1);

    /* Z-index */
    --z-index-0: 0;
    --z-index-100: 100;
    --z-index-200: 200;
    --z-index-300: 300;
    --z-index-400: 400;
    --z-index-500: 500;
    --z-index-600: 600;
    --z-index-700: 700;
    --z-index-800: 800;
    --z-index-900: 900;

    /* Shadows */
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
    --box-shadow-modal: var(--ds-shadow-border), 0px 1px 1px rgba(0, 0, 0, 0.02),
      0px 8px 16px -4px rgba(0, 0, 0, 0.04),
      0px 24px 32px -8px rgba(0, 0, 0, 0.06);
    --box-shadow-menu: var(--ds-shadow-border), 0px 1px 1px rgba(0, 0, 0, 0.02),
      0px 4px 8px -4px rgba(0, 0, 0, 0.04),
      0px 16px 24px -8px rgba(0, 0, 0, 0.06);
    --box-shadow-paper: var(--ds-shadow-border),
      0px 1px 3px 0 rgba(0, 0, 0, 0.05);
    --shadow-small: 0px 2px 2px rgba(0, 0, 0, 0.04);

    /* Table layout */
    --table-layout-min-height: 100px;
    --container-height: 600px;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: var(--font-family-base);
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-family-heading) !important;
    font-weight: 700 !important;
    margin: 0 !important;
  }

  strong {
    font-weight: var(--font-weight-strong) !important;
  }

  label {
    cursor: pointer;
  }

  .visually-hidden {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }

  .container {
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    max-width: calc(100vw - 24px);
  }

  /* Ant Design overrides */
  .ant-collapse-header {
    align-items: center !important;
  }

  th.ant-table-cell {
    white-space: nowrap !important;
  }

  .ant-table-wrapper {
    & .ant-spin {
      min-height: var(--table-layout-min-height);
    }
  }

  .ant-table {
    background-color: transparent !important;
  }

  .ant-table-thead th.ant-table-column-has-sorters {
    &:hover {
      background: none !important;
    }
    background: none !important;
  }

  .ant-table-cell.ant-table-column-sort:not(.ant-table-cell-row-hover) {
    background: none !important;
  }

  .ant-table .ant-table-container {
    & thead.ant-table-thead .ant-table-cell {
      font-weight: var(--font-weight-strong) !important;
      height: 32px;
    }

    & .rc-virtual-list .ant-table-cell {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    & .ant-table-cell.ant-table-selection-column {
      &:hover {
        background-color: var(--color-gray-2) !important;
      }
    }

    & tr:last-of-type td {
      border-color: transparent !important;
    }

    & tr:first-of-type td:first-of-type {
      border-top-left-radius: var(--radius-base) !important;
    }

    & tr:first-of-type td:last-of-type {
      border-top-right-radius: var(--radius-base) !important;
    }

    & tr:last-of-type td:first-of-type {
      border-bottom-left-radius: var(--radius-base) !important;
    }

    & tr:last-of-type td:last-of-type {
      border-bottom-right-radius: var(--radius-base) !important;
    }
  }

  .ant-modal .ant-modal-title {
    font-weight: var(--font-weight-strong) !important;
  }

  .ant-tabs-nav .ant-tabs-tab + .ant-tabs-tab {
    margin-top: 0 !important;
  }
`;
