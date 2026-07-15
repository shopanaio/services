import type { UniqueIdentifier } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import type { CSSProperties } from "react";
import { type RenderItem, Item } from "./item";

interface SortableItemProps {
  containerId: UniqueIdentifier;
  id: UniqueIdentifier;
  index: number;
  disabled?: boolean;
  getIndex(id: UniqueIdentifier): number;
  renderItem: RenderItem;
  wrapperStyle?: CSSProperties;
}

export function SortableItem({
  disabled,
  id,
  index,
  renderItem,
  containerId,
  wrapperStyle,
}: SortableItemProps) {
  const {
    setNodeRef,
    listeners,
    isDragging,
    isSorting,
    transform,
    transition,
  } = useSortable({
    id,
    data: {
      type: "item",
      containerId,
      index,
    },
  });

  return (
    <Item
      dragging={isDragging}
      index={index}
      listeners={listeners}
      ref={disabled ? undefined : setNodeRef}
      sorting={isSorting}
      transform={transform}
      transition={transition}
      value={id}
      wrapperStyle={wrapperStyle}
      renderItem={renderItem}
    />
  );
}
