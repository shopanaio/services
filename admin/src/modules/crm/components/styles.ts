import { css } from '@emotion/react';

const fontWeight = '400';
const textColor = '#333';

export const wrapper = css`
  display: flex;
  border-radius: var(--radius-base);
  box-sizing: border-box;
  transform: translate3d(var(--translate-x, 0), var(--translate-y, 0), 0)
    scaleX(var(--scale-x, 1)) scaleY(var(--scale-y, 1));
  transform-origin: 0 0;
  touch-action: manipulation;

  &.dragOverlay {
    border: 2px solid var(--color-blue-5);
    z-index: 999;
  }
`;

export const item = css`
  -webkit-tap-highlight-color: transparent;
  background-color: var(--color-gray-1);
  border-radius: var(--radius-base);
  border: 1px solid var(--color-border);
  box-shadow: 1px 2px 5px 0 rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
  color: ${textColor};
  flex-grow: 1;
  font-size: 1rem;
  font-weight: ${fontWeight};
  list-style: none;
  outline: none;
  padding: 18px 20px;
  position: relative;
  transform-origin: 50% 50%;
  transform: scale(var(--scale, 1));
  transition: box-shadow 200ms cubic-bezier(0.18, 0.67, 0.6, 1.22);
  white-space: nowrap;

  &:not(.withHandle) {
    touch-action: manipulation;
    cursor: grab;
  }

  &.dragging:not(.dragOverlay) {
    opacity: var(--dragging-opacity, 0.5);
    z-index: 0;
  }

  &.dragOverlay {
    cursor: inherit;
    opacity: 1;
  }
`;
