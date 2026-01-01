import { CSSProperties, useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';

import { css } from '@emotion/react';
import { EntryTag } from '@components/forms/EntryTag';
import { CSS } from '@dnd-kit/utilities';
import { Button, Tag } from 'antd';
import {
  MdArrowDownward,
  MdArrowUpward,
  MdClose,
  MdDragIndicator,
} from 'react-icons/md';
import { Flex } from '@components/utility/Flex';
import { iconProps } from '@components/styles';
import { Box } from '@components/utility/Box';
import { IEntryOption } from '@src/entity/EntryOption/EntryOption';

interface ITagsListProps<T = IEntryOption> {
  value: T[];
  setValue: (value: T[]) => void;
  sortable?: boolean;
}

export const TagsList = <T extends IEntryOption>({
  value,
  setValue,
  sortable,
}: ITagsListProps<T>) => {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState<boolean>(false);

  const items = useMemo(() => {
    return value || [];
  }, [value]);

  const activeItem = useMemo(() => {
    return items.find((it: T) => it.id === activeId);
  }, [items, activeId]);

  const activeItems = useMemo(() => {
    if (showAll) {
      return items;
    }

    return items.slice(0, 5);
  }, [items, showAll]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (!event?.active?.id) {
      return;
    }
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;

    if (over && active.id !== over.id) {
      const ids = items.map((it: T) => it.id);
      const oldIndex = ids.indexOf(active.id as number);
      const newIndex = ids.indexOf(over.id as number);

      setValue(arrayMove(items, oldIndex, newIndex));
    }
  };

  const renderCollapseButton = useCallback((all: boolean, qty: number) => {
    if (qty <= 5) {
      return null;
    }

    return (
      <Box mt="2">
        <Button
          css={css`
            padding-left: 0;
          `}
          onClick={() => setShowAll((v) => !v)}
          type="link"
          icon={all ? <MdArrowUpward /> : <MdArrowDownward />}
        >
          {all ? 'Show less' : 'Show all'}
        </Button>
      </Box>
    );
  }, []);

  if (!sortable) {
    return (
      <>
        <Flex wrap="wrap">
          {activeItems?.map((it: T) => (
            <EntryTag
              key={it.id}
              entry={it}
              onClose={() => {
                setValue(items.filter((v: T) => v.id !== it.id));
              }}
            />
          ))}
        </Flex>
        {renderCollapseButton(showAll, items.length)}
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
    >
      <Flex wrap="wrap" mt="2">
        <SortableContext
          items={items.filter((it: T) => it?.id).map((it: T) => it.id)}
          strategy={rectSortingStrategy}
        >
          {activeItems?.map((it: T) => (
            <SortableTag
              key={it.id}
              value={it}
              onClose={() => {
                setValue(items.filter((v: T) => v.id !== it.id));
              }}
            />
          ))}
          {activeItem ? (
            <DragOverlay>
              <SortableTag
                key={activeItem.id}
                value={activeItem}
                onClose={() => {}}
              />
            </DragOverlay>
          ) : null}
        </SortableContext>
        {renderCollapseButton(showAll, items.length)}
      </Flex>
    </DndContext>
  );
};

interface ISortableTagProps<T extends IEntryOption> {
  value: T;
  onClose: () => void;
  isMain?: boolean;
}

function SortableTag<T extends IEntryOption>({
  value,
  onClose,
}: ISortableTagProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: value.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: '100%',
    height: '100%',
    zIndex: isDragging ? 9999 : 'auto',
    opacity: isDragging ? 0.3 : 1,
    pointerEvents: isDragging ? 'none' : 'auto',
    marginBottom: 'var(--x2)',
  } as CSSProperties;

  const title = value?.title || value?.slug;
  if (!title) {
    return null;
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Tag
        color={value.color || 'blue'}
        css={css`
          cursor: pointer;
          width: 324px;
        `}
        icon={
          <MdDragIndicator
            size={12}
            css={css`
              cursor: grab;
              transform: translateY(2px);
              margin-right: var(--x1);
            `}
          />
        }
        onClose={onClose}
      >
        <div
          css={css`
            width: calc(100% - 16px);
            display: inline-flex;
            justify-content: space-between;
            align-items: center;
          `}
        >
          {title} <MdClose size={12} onClick={onClose} />
        </div>
      </Tag>
    </div>
  );
}
