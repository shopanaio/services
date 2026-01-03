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
    /* Font families */
    --font-family-heading: var(--font-safiro), sans-serif;
    --font-family-base: var(--font-safiro), sans-serif;
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
    font-weight: 500 !important;
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
      min-height: 100px;
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
      font-weight: 500 !important;
      height: 32px;
    }

    & .rc-virtual-list .ant-table-cell {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    & .ant-table-cell.ant-table-selection-column {
      &:hover {
        background-color: var(--ant-color-bg-layout) !important;
      }
    }

    & tr:last-of-type td {
      border-color: transparent !important;
    }

    & tr:first-of-type td:first-of-type {
      border-top-left-radius: var(--ant-border-radius) !important;
    }

    & tr:first-of-type td:last-of-type {
      border-top-right-radius: var(--ant-border-radius) !important;
    }

    & tr:last-of-type td:first-of-type {
      border-bottom-left-radius: var(--ant-border-radius) !important;
    }

    & tr:last-of-type td:last-of-type {
      border-bottom-right-radius: var(--ant-border-radius) !important;
    }
  }

  .ant-modal .ant-modal-title {
    font-weight: 500 !important;
  }

  .ant-tabs-nav .ant-tabs-tab + .ant-tabs-tab {
    margin-top: 0 !important;
  }
`;
