/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
import React, { ReactNode, forwardRef } from 'react';
import { UniqueIdentifier } from '@dnd-kit/core';

export type IRenderColumnProps = {
  value: UniqueIdentifier;
  dragOverlay?: boolean;
  handleProps?: React.HTMLAttributes<any>;
  children: ReactNode;
  disabled?: boolean;
  count?: number;
};

export type IRenderColumn = (props: IRenderColumnProps) => ReactNode;

export interface Props {
  children?: React.ReactNode;
  value: UniqueIdentifier;
  style?: React.CSSProperties;
  handleProps?: React.HTMLAttributes<any>;
  dragOverlay?: boolean;
  renderColumn: IRenderColumn;
  disabled?: boolean;
  count?: number;
}

export const Container = forwardRef<HTMLDivElement, Props>(
  (
    {
      children,
      handleProps,
      value,
      dragOverlay,
      renderColumn,
      disabled,
      count,
      ...props
    }: Props,
    ref,
  ) => {
    return (
      <div {...props} ref={ref} tabIndex={0}>
        {renderColumn({
          value,
          handleProps,
          dragOverlay,
          children,
          disabled,
          count,
        })}
      </div>
    );
  },
);
