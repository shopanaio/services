import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CancelDrop,
  closestCenter,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
  DndContext,
  DragOverlay,
  DropAnimation,
  getFirstCollision,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  UniqueIdentifier,
  useSensors,
  useSensor,
  MeasuringStrategy,
  defaultDropAnimationSideEffects,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';

import { Container } from '@components/boards/Container';
import { SortableItem } from '@components/boards/SortableItem';
import { DroppableContainer } from '@components/boards/DroppableContainer';
import VirtualList, { ItemInfo } from 'react-tiny-virtual-list';
import AutoSizer from 'react-virtualized-auto-sizer';
import { IRenderItem, Item } from '@components/boards/Item/Item';
import { IRenderColumn } from '@components/boards/Container/Container';
import { coordinateGetter } from './keyboardCoordinates';

const dropAnimation: DropAnimation = {
  duration: 50,
  easing: 'ease-out',
};

export type Items = Record<UniqueIdentifier, UniqueIdentifier[]>;

interface IBoardsProps {
  cancelDrop?: CancelDrop;
  items: Items;
  renderColumn: IRenderColumn;
  renderItem: IRenderItem;
  setItems: (next: Items) => void;
  itemSize: number;
  commitItems: (
    items: Items,
    targetColumn: UniqueIdentifier,
    targetItem: UniqueIdentifier,
  ) => void;
  commitContainers: (containers: UniqueIdentifier[]) => void;
  containers: UniqueIdentifier[];
}

export const Boards = ({
  cancelDrop,
  renderItem,
  itemSize,
  items,
  setItems,
  renderColumn,
  commitItems,
  commitContainers,
  containers,
}: IBoardsProps) => {
  const [activeId, setActiveId] = useState<{
    id: UniqueIdentifier;
    type: 'container' | 'item';
  } | null>(null);

  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);
  const isSortingContainer = activeId ? activeId.type === 'container' : false;

  /**
   * Custom collision detection strategy optimized for multiple containers
   *
   * - First, find any droppable containers intersecting with the pointer.
   * - If there are none, find intersecting containers with the active draggable.
   * - If there are no intersecting containers, return the last matched intersection
   *
   */
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      // TODO: fix
      if (activeId && activeId.id in items) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.id in items,
          ),
        });
      }

      // Start by finding any intersecting droppable
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0
          ? // If there are droppables intersecting with the pointer, return those
            pointerIntersections
          : rectIntersection(args);
      let overId = getFirstCollision(intersections, 'id');

      if (overId != null) {
        if (overId in items) {
          const containerItems = items[overId];

          // If a container is matched and it contains items (columns 'A', 'B', 'C')
          if (containerItems.length > 0) {
            // Return the closest droppable within that container
            overId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId &&
                  containerItems.includes(container.id),
              ),
            })[0]?.id;
          }
        }

        lastOverId.current = overId;
        return [{ id: overId }];
      }

      // When a draggable item moves to a new container, the layout may shift
      // and the `overId` may become `null`. We manually set the cached `lastOverId`
      // to the id of the draggable item that was moved to the new container, otherwise
      // the previous `overId` will be returned which can cause items to incorrectly shift positions
      if (recentlyMovedToNewContainer.current) {
        // ......
        lastOverId.current = activeId?.id || null;
      }

      // If no droppable is matched, return the last match
      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeId, items],
  );

  const [clonedItems, setClonedItems] = useState<Items | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 2,
      },
    }),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter,
    }),
  );

  const findContainer = useCallback(
    (id: UniqueIdentifier) => {
      if (id in items) {
        return id;
      }

      return Object.keys(items).find((key) => items[key].includes(id));
    },
    [items],
  );

  const getIndex = useCallback(
    (id: UniqueIdentifier) => {
      const container = findContainer(id);

      if (!container) {
        return -1;
      }

      return items[container].indexOf(id);
    },
    [findContainer, items],
  );

  const onDragCancel = () => {
    if (clonedItems) {
      // Reset items to their original state in case items have been
      // Dragged across containers
      setItems(clonedItems);
    }

    setActiveId(null);
    setClonedItems(null);
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [items]);

  const onDragOver = useCallback(
    ({ active, over }: DragOverEvent) => {
      const overId = over?.id;

      if (overId == null || active.id in items) {
        return;
      }

      const overContainer = findContainer(overId);
      const activeContainer = findContainer(active.id);

      if (!overContainer || !activeContainer) {
        return;
      }

      if (activeContainer !== overContainer) {
        const activeItems = items[activeContainer];
        const overItems = items[overContainer];
        const overIndex = overItems.indexOf(overId);
        const activeIndex = activeItems.indexOf(active.id);

        let newIndex: number;

        if (overId in items) {
          newIndex = overItems.length + 1;
        } else {
          const isBelowOverItem =
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top >
              over.rect.top + over.rect.height;

          const modifier = isBelowOverItem ? 1 : 0;

          newIndex =
            overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
        }

        recentlyMovedToNewContainer.current = true;

        setItems({
          ...items,
          [activeContainer]: items[activeContainer].filter(
            (item: any) => item !== active.id,
          ),
          [overContainer]: [
            ...items[overContainer].slice(0, newIndex),
            items[activeContainer][activeIndex],
            ...items[overContainer].slice(
              newIndex,
              items[overContainer].length,
            ),
          ],
        });
      }
    },
    [findContainer, items, setItems],
  );

  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (active.data.current?.type === 'container' && over?.id) {
        const activeIndex = containers.indexOf(active.id);
        const overIndex = containers.indexOf(over.id);
        commitContainers(arrayMove(containers, activeIndex, overIndex));
        return;
      }

      const activeContainer = active.data.current?.containerId;
      if (!activeContainer) {
        setActiveId(null);
        return;
      }

      if (!over?.id) {
        setActiveId(null);
        return;
      }

      const overContainer = over?.data.current?.containerId;

      if (overContainer) {
        const activeIndex = items[activeContainer].indexOf(active.id);
        const overIndex = items[overContainer].indexOf(over.id);

        commitItems(
          {
            ...items,
            [activeContainer]: arrayMove(
              items[activeContainer],
              activeIndex,
              overIndex,
            ),
          },
          activeContainer,
          active.id,
        );
      }

      setActiveId(null);
    },
    [items, commitItems, commitContainers, containers],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      onDragStart={({ active }) => {
        setActiveId({ id: active.id, type: active.data?.current?.type });
        setClonedItems(items);
      }}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      cancelDrop={cancelDrop}
      onDragCancel={onDragCancel}
    >
      <div
        style={{
          display: 'inline-grid',
          boxSizing: 'border-box',
          gridAutoFlow: 'column',
        }}
      >
        <SortableContext
          items={[...containers]}
          strategy={horizontalListSortingStrategy}
        >
          {containers.map((containerId, containerIdx) => {
            const itemCount = items[containerId].length;

            return (
              <DroppableContainer
                key={containerId}
                id={containerId}
                value={containerId}
                items={items[containerId]}
                index={containerIdx}
                renderColumn={renderColumn}
                count={itemCount}
              >
                <SortableContext
                  items={items[containerId]}
                  strategy={verticalListSortingStrategy}
                >
                  <AutoSizer>
                    {({ height, width }) => {
                      return (
                        <VirtualList
                          height={height}
                          width={width}
                          itemSize={itemSize}
                          overscanCount={2}
                          itemCount={itemCount}
                          renderItem={({ index, style }: ItemInfo) => {
                            const item = items[containerId][index];

                            if (!item) {
                              return null;
                            }

                            return (
                              <SortableItem
                                key={item}
                                renderItem={renderItem}
                                disabled={isSortingContainer}
                                id={item}
                                index={index}
                                wrapperStyle={style}
                                containerId={containerId}
                                getIndex={getIndex}
                              />
                            );
                          }}
                        />
                      );
                    }}
                  </AutoSizer>
                </SortableContext>
              </DroppableContainer>
            );
          })}
        </SortableContext>
      </div>
      <DragOverlay adjustScale={false} dropAnimation={dropAnimation}>
        {activeId
          ? activeId.type === 'container'
            ? renderContainerDragOverlay(activeId.id)
            : renderSortableItemDragOverlay(activeId.id)
          : null}
      </DragOverlay>
    </DndContext>
  );

  function renderSortableItemDragOverlay(id: UniqueIdentifier) {
    return <Item key={id} value={id} dragOverlay renderItem={renderItem} />;
  }

  function renderContainerDragOverlay(containerId: UniqueIdentifier) {
    return (
      <Container
        key={containerId}
        dragOverlay
        value={containerId}
        renderColumn={renderColumn}
      />
    );
  }
};
