/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
import React, { useEffect } from 'react';
import classNames from 'classnames';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import { CSS, type Transform } from '@dnd-kit/utilities';

import * as s from './styles';

export interface Props {
  dragOverlay?: boolean;
  disabled?: boolean;
  dragging?: boolean;
  index?: number;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  sorting?: boolean;
  style?: React.CSSProperties;
  transition?: string | null;
  wrapperStyle?: React.CSSProperties;
  value: React.ReactNode;
  renderItem: IRenderItem;
}

export interface IRenderItemProps {
  dragOverlay?: boolean;
  dragging?: boolean;
  sorting?: boolean;
  index: number | undefined;
  value: number | string;
}

export type IRenderItem = (props: IRenderItemProps) => React.ReactNode;

export const Item = React.forwardRef<HTMLLIElement, Props>(
  (
    {
      dragOverlay,
      dragging,
      index,
      listeners,
      sorting,
      transition,
      transform,
      value,
      wrapperStyle,
      renderItem,
    },
    ref,
  ) => {
    useEffect(() => {
      if (!dragOverlay) {
        return;
      }

      document.body.style.cursor = 'grabbing';
      return () => {
        document.body.style.cursor = '';
      };
    }, [dragOverlay]);

    return (
      <li
        data-testid="board-sortable-item"
        className={classNames({
          dragging,
          dragOverlay,
        })}
        css={s.wrapper}
        style={
          {
            ...wrapperStyle,
            transition,
            ...(transform
              ? {
                  '--translate-x': `${Math.round(transform.x)}px`,
                  '--translate-y': `${Math.round(transform.y)}px`,
                }
              : {}),
          } as React.CSSProperties
        }
        ref={ref}
        {...listeners}
        tabIndex={0}
      >
        {renderItem({ dragOverlay, dragging, sorting, index, value })}
      </li>
    );
  },
);
