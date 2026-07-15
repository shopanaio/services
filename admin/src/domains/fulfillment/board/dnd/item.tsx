import React, { useEffect, type CSSProperties, type ReactNode } from "react";
import classNames from "classnames";
import type { DraggableSyntheticListeners, UniqueIdentifier } from "@dnd-kit/core";
import type { Transform } from "@dnd-kit/utilities";
import { createStyles } from "antd-style";

const useStyles = createStyles(({ css, token }) => ({
  wrapper: css`
    border-radius: 6px;
    box-sizing: border-box;
    display: flex;
    flex-grow: 1;
    list-style: none;
    outline: none;
    touch-action: manipulation;
    transform: translate3d(var(--translate-x, 0), var(--translate-y, 0), 0);
    cursor: pointer;

    &.dragging:not(.dragOverlay) {
      z-index: 0;
    }

    &.dragOverlay {
      cursor: inherit;
      opacity: 0.3;
      z-index: ${token.zIndexPopupBase + 100};
    }
  `,
}));

export interface Props {
  dragOverlay?: boolean;
  disabled?: boolean;
  dragging?: boolean;
  index?: number;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  sorting?: boolean;
  style?: CSSProperties;
  transition?: string | null;
  wrapperStyle?: CSSProperties;
  value: ReactNode;
  renderItem: RenderItem;
}

export interface RenderItemProps {
  dragOverlay?: boolean;
  dragging?: boolean;
  sorting?: boolean;
  index: number | undefined;
  value: number | string;
}

export type RenderItem = (props: RenderItemProps) => ReactNode;

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
    const { styles } = useStyles();

    useEffect(() => {
      if (!dragOverlay) {
        return;
      }

      document.body.style.cursor = "grabbing";
      return () => {
        document.body.style.cursor = "";
      };
    }, [dragOverlay]);

    return (
      <li
        data-testid="board-sortable-item"
        className={classNames(styles.wrapper, {
          dragging,
          dragOverlay,
        })}
        style={
          {
            ...wrapperStyle,
            transition: transition ?? undefined,
            ...(transform
              ? {
                  "--translate-x": `${Math.round(transform.x)}px`,
                  "--translate-y": `${Math.round(transform.y)}px`,
                }
              : {}),
          } as CSSProperties
        }
        ref={ref}
        {...listeners}
        tabIndex={0}
      >
        {renderItem({ dragOverlay, dragging, sorting, index, value: value as number | string })}
      </li>
    );
  },
);
