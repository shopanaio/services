"use client";

import { createGlobalStyle } from "antd-style";

export const EditorGlobalStyles = createGlobalStyle`
  /* EditorJS base styles */
  .codex-editor {
    color: var(--ant-color-text);
  }

  .codex-editor * {
    font-family: inherit !important;
  }

  /* Placeholder */
  .ce-paragraph[data-placeholder]:empty::before {
    color: var(--ant-color-text-placeholder) !important;
  }

  /* Block content */
  .ce-block__content {
    color: var(--ant-color-text);
  }

  /* Headers */
  .ce-header {
    color: var(--ant-color-text) !important;
  }

  /* Toolbar (plus and drag buttons) */
  .ce-toolbar__plus,
  .ce-toolbar__settings-btn {
    color: var(--ant-color-text-secondary) !important;
    background-color: var(--ant-color-bg-container) !important;

    &:hover {
      background-color: var(--ant-color-fill-tertiary) !important;
      color: var(--ant-color-text) !important;
    }
  }

  /* Delimiter */
  .ce-delimiter::before {
    color: var(--ant-color-text-disabled) !important;
  }

  /* List */
  .cdx-list__item {
    color: var(--ant-color-text);
  }

  /* Links */
  .codex-editor a {
    color: var(--ant-color-link);
  }

  /* Block selection highlight */
  .ce-block--selected .ce-block__content {
    background-color: var(--ant-color-primary-bg) !important;
  }

  /* EditorJS Popover */
  .ce-popover {}

  .ce-popover__container {
    background-color: var(--ant-color-bg-elevated) !important;
    border: none !important;
  }

  .ce-popover__items {
    background-color: var(--ant-color-bg-elevated) !important;
  }

  .ce-popover-item {
    color: var(--ant-color-text) !important;

    &:hover {
      background-color: var(--ant-color-fill-tertiary) !important;
    }
  }

  .ce-popover-item__icon {
    background-color: var(--ant-color-fill-secondary) !important;
    color: var(--ant-color-text) !important;
  }

  .ce-popover-item__title {
    color: var(--ant-color-text) !important;
  }

  .ce-popover-item__secondary-title {
    color: var(--ant-color-text-secondary) !important;
  }

  .ce-popover-item--focused {
    background-color: var(--ant-color-fill-secondary) !important;
  }

  /* Popover search/filter */
  .ce-popover__search,
  .ce-popover-search {
    background-color: var(--ant-color-bg-container) !important;
  }

  .ce-popover__search input,
  .ce-popover-search__input {
    background-color: var(--ant-color-bg-container) !important;
    color: var(--ant-color-text) !important;

    &::placeholder {
      color: var(--ant-color-text-placeholder) !important;
    }
  }

  .ce-popover-search__icon {
    color: var(--ant-color-text-secondary) !important;
  }

  /* Popover header */
  .ce-popover-header {
    background-color: var(--ant-color-bg-elevated) !important;
  }

  /* Separators */
  .ce-popover-item-separator .ce-popover-item-separator__line {
    background-color: var(--ant-color-border-secondary) !important;
  }

  /* Inline toolbar */
  .ce-inline-toolbar {
    background-color: var(--ant-color-bg-elevated) !important;
    box-shadow: var(--ant-box-shadow-secondary) !important;
  }

  .ce-inline-toolbar__dropdown {
    background-color: var(--ant-color-bg-elevated) !important;
  }

  .ce-inline-tool {
    color: var(--ant-color-text) !important;

    &:hover {
      background-color: var(--ant-color-fill-tertiary) !important;
    }
  }

  .ce-inline-tool--active {
    color: var(--ant-color-primary) !important;
  }

  .ce-inline-tool-input {
    background-color: var(--ant-color-bg-container) !important;
    color: var(--ant-color-text) !important;
  }

  /* Conversion toolbar */
  .ce-conversion-toolbar {
    background-color: var(--ant-color-bg-elevated) !important;
    box-shadow: var(--ant-box-shadow-secondary) !important;
  }

  .ce-conversion-tool {
    color: var(--ant-color-text) !important;

    &:hover {
      background-color: var(--ant-color-fill-tertiary) !important;
    }
  }

  .ce-conversion-tool__icon {
    background-color: var(--ant-color-fill-secondary) !important;
  }

  .ce-toolbox__button {
    color: var(--ant-color-text) !important;

    &:hover {
      background-color: var(--ant-color-fill-tertiary) !important;
    }
  }

  .ce-settings__button,
  .cdx-settings-button {
    color: var(--ant-color-text) !important;

    &:hover {
      background-color: var(--ant-color-fill-tertiary) !important;
    }
  }

  .cdx-settings-button--active {
    color: var(--ant-color-primary) !important;
  }
`;
