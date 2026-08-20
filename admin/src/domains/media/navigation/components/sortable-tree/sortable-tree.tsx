"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  closestCenter,
  defaultDropAnimation,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  type Modifier,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { NavigationMenuItem } from "../../types";
import { SortableTreeItem } from "./sortable-tree-item";
import {
  buildTree,
  flattenTree,
  getChildCount,
  getProjection,
  removeCollapsedChildren,
  setCollapsed,
  type FlattenedNavigationItem,
} from "./utilities";

interface SortableTreeProps {
  value: NavigationMenuItem[];
  onChange: (items: NavigationMenuItem[]) => void;
  indentationWidth?: number;
  onEdit: (item: NavigationMenuItem) => void;
  onRemove: (id: UniqueIdentifier) => void;
}

const dropAnimation: DropAnimation = {
  keyframes({ transform }) {
    return [
      { opacity: 1, transform: CSS.Transform.toString(transform.initial) },
      {
        opacity: 0,
        transform: CSS.Transform.toString({
          ...transform.final,
          x: transform.final.x + 5,
          y: transform.final.y + 5,
        }),
      },
    ];
  },
  easing: "ease-out",
  sideEffects({ active }) {
    active.node.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: defaultDropAnimation.duration,
      easing: defaultDropAnimation.easing,
    });
  },
};

const adjustOverlay: Modifier = ({ transform }) => ({
  ...transform,
  y: transform.y + 8,
});

export function SortableTree({
  value: items,
  onChange,
  indentationWidth = 50,
  onEdit,
  onRemove,
}: SortableTreeProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const flattenedItems = useMemo(
    () => removeCollapsedChildren(flattenTree(items), activeId),
    [activeId, items],
  );
  const projected =
    activeId && overId
      ? getProjection(flattenedItems, activeId, overId, offsetLeft, indentationWidth)
      : null;
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const activeItem = activeId ? flattenedItems.find((item) => item.id === activeId) : null;
  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  const reset = () => {
    setActiveId(null);
    setOverId(null);
    setOffsetLeft(0);
    document.body.style.cursor = "";
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id);
    setOverId(active.id);
    document.body.style.cursor = "grabbing";
  };
  const handleDragMove = ({ delta }: DragMoveEvent) => setOffsetLeft(delta.x);
  const handleDragOver = ({ over }: DragOverEvent) => setOverId(over?.id ?? null);
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    reset();
    if (!projected || !over) return;
    const cloned: FlattenedNavigationItem[] = structuredClone(flattenTree(items));
    const overIndex = cloned.findIndex((item) => item.id === over.id);
    const activeIndex = cloned.findIndex((item) => item.id === active.id);
    cloned[activeIndex] = { ...cloned[activeIndex], ...projected };
    onChange(buildTree(arrayMove(cloned, activeIndex, overIndex)));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={reset}
    >
      <SortableContext
        items={flattenedItems.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {flattenedItems.map(({ id, title, children, collapsed, depth, ...item }) => (
          <SortableTreeItem
            key={id}
            id={id}
            title={title}
            depth={id === activeId && projected ? projected.depth : depth}
            indentationWidth={indentationWidth}
            indicator
            collapsed={Boolean(collapsed && children.length)}
            onCollapse={children.length ? () => onChange(setCollapsed(items, id)) : undefined}
            onRemove={() => onRemove(id)}
            onEdit={() => onEdit({ id, title, children, collapsed, ...item })}
          />
        ))}
        {activeId
          ? createPortal(
              <DragOverlay dropAnimation={dropAnimation} modifiers={[adjustOverlay]}>
                {activeId && activeItem ? (
                  <SortableTreeItem
                    id={activeId}
                    depth={activeItem.depth}
                    clone
                    childCount={getChildCount(items, activeId) + 1}
                    title={activeItem.title}
                    indentationWidth={indentationWidth}
                  />
                ) : null}
              </DragOverlay>,
              document.body,
            )
          : null}
      </SortableContext>
    </DndContext>
  );
}
