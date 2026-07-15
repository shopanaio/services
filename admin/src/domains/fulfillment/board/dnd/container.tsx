import type { DraggableAttributes, DraggableSyntheticListeners, UniqueIdentifier } from "@dnd-kit/core";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export interface DragHandleProps { attributes?: DraggableAttributes; listeners?: DraggableSyntheticListeners }

export interface RenderColumnProps {
  value: UniqueIdentifier;
  dragOverlay?: boolean;
  handleProps?: DragHandleProps;
  children?: ReactNode;
  disabled?: boolean;
  count?: number;
}

export type RenderColumn = (props: RenderColumnProps) => ReactNode;

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  value: UniqueIdentifier;
  handleProps?: DragHandleProps;
  dragOverlay?: boolean;
  renderColumn: RenderColumn;
  disabled?: boolean;
  count?: number;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(function Container(
  { children, handleProps, value, dragOverlay, renderColumn, disabled, count, ...props },
  ref,
) {
  return <div {...props} ref={ref} tabIndex={0}>{renderColumn({ value, handleProps, dragOverlay, children, disabled, count })}</div>;
});
