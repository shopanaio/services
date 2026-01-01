import { css } from '@emotion/react';

export const remirrorStyles = {
  cmdButton: (active: boolean) => css`
    background: ${active ? 'var(--color-gray-3)' : 'transparent'};

    &:hover:not(:disabled) {
      background: ${active
        ? 'var(--color-gray-3)'
        : 'var(--color-gray-2)'} !important;
    }
  `,
  container: css`
    display: flex;
    flex-direction: column;
    gap: var(--x4);
  `,
  toolbar: css`
    display: flex;
    gap: var(--x4);
    padding: var(--x1);
    position: absolute;
    top: 0;
    z-index: 1;
    background-color: white;
    border-radius: var(--radius-base);
  `,
  editor: css`
    & .remirror-editor-wrapper {
      /* background-color: gray; */
      overflow: hidden;
      height: calc(100% - 40px);
      border-radius: var(--radius-base);
    }

    & .remirror-editor {
      height: 100%;
      height: 100%;
      min-height: 200px;
      max-height: var(--editor-max-height, 100%);
      padding: var(--x2) var(--x4);
      overflow-y: auto;
      outline: none;
      border: none;
    }

    height: 100%;
    cursor: text;
    box-sizing: border-box;
    min-height: 200px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    transition: all 0.3s ease;
    box-shadow: var(--shadow-primary-0);
    position: relative;
    outline: 4px solid transparent;
    padding-top: 40px;
    overflow: hidden;

    &::after {
      content: '';
      position: absolute;
      inset: 1px;
      border-radius: var(--radius-base);
      background-color: var(--color-gray-1);
      opacity: 0.4;
      height: 100%;
      width: 100%;
      z-index: 100;
      display: block;
      cursor: pointer;
    }

    &.editable::after {
      display: none;
    }

    &:focus-within {
      outline-color: var(--color-gray-4);
      border-color: var(--color-primary-10);
    }

    &:hover:not(:focus-within) {
      border-color: var(--color-primary-10);
    }
  `,
};
