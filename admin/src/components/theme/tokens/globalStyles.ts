import { css } from '@emotion/react';

export const globalCss = css`
  :root {
    --table-layout-min-height: 100px;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
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

  .ant-modal .ant-modal-content {
    /* border: 1px solid var(--color-gray-5) !important; */
  }

  .ant-tabs-nav .ant-tabs-tab + .ant-tabs-tab {
    margin-top: 0 !important;
  }
`;
