import { css } from '@emotion/react';

export const wrapper = css`
  /* background-color: var(--color-gray-1); */
  border-radius: var(--radius-base);
  box-sizing: border-box;
  display: flex;
  flex-grow: 1;
  list-style: none;
  outline: none;
  touch-action: manipulation;
  /* transform-origin: 0 0; */
  transform: translate3d(var(--translate-x, 0), var(--translate-y, 0), 0);
  /* transition: all 200ms ease; */
  cursor: pointer;

  &.dragging:not(.dragOverlay) {
    z-index: 0;
  }

  &.dragOverlay {
    cursor: inherit;
    opacity: 0.3;
    z-index: 99999;
  }
`;
