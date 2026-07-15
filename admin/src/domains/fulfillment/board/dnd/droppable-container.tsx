import { CSS } from "@dnd-kit/utilities";
import type { UniqueIdentifier } from "@dnd-kit/core";
import { defaultAnimateLayoutChanges, useSortable, type AnimateLayoutChanges } from "@dnd-kit/sortable";
import { Container, type ContainerProps, type RenderColumn } from "./container";

const animateLayoutChanges: AnimateLayoutChanges = (args) => defaultAnimateLayoutChanges({ ...args, wasDragging: true });

type DroppableContainerProps = Omit<ContainerProps, "id"> & { disabled?: boolean; id: UniqueIdentifier; items: UniqueIdentifier[]; index: number; renderColumn: RenderColumn };

export function DroppableContainer({ children, disabled, id, items, index, renderColumn, ...props }: DroppableContainerProps) {
  const { attributes, isDragging, listeners, setNodeRef, transition, transform } = useSortable({ id, disabled, data: { type: "container", children: items, index }, animateLayoutChanges });
  return (
    <Container
      ref={disabled ? undefined : setNodeRef}
      style={{ height: "100%", transition, transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : undefined }}
      handleProps={{ attributes, listeners }}
      renderColumn={renderColumn}
      disabled={disabled}
      {...props}
    >{children}</Container>
  );
}
