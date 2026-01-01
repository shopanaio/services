import React, { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MediaFilePlaceholder } from '@/components/media/control/Placeholder';

interface ISortableGridItemProps {
  id: string;
  children?: React.ReactNode;
  index: number;
  gap: number;
}

export const SortableGridItem = ({
  id,
  children,
  gap = 16,
}: ISortableGridItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    activeIndex,
    index,
    overIndex,
    rect,
  } = useSortable({ id });

  const getTransform = () => {
    if (!transform || !rect.current) {
      return transform;
    }

    const getPrimaryIndexTransform = (rect: {
      width: number;
      height: number;
    }) => {
      return {
        ...transform,
        x: (transform?.x || 0) + rect.width / 2 + gap / 2,
        y: (transform?.y || 0) + rect.height / 2 + gap / 2,
      };
    };

    const getSecondaryIndexTransform = (rect: {
      width: number;
      height: number;
    }) => {
      return {
        ...transform,
        x: (transform?.x || 0) - rect.width / 4 - gap / 4,
        y: (transform?.y || 0) - rect.height / 4 - gap / 4,
      };
    };

    if (index === activeIndex && activeIndex !== 0 && overIndex === 0) {
      return getPrimaryIndexTransform(rect.current);
    } else if (index === 0 && activeIndex !== 0 && overIndex === 0) {
      return getSecondaryIndexTransform(rect.current);
    } else if (activeIndex === 0 && overIndex !== 0 && index <= 1) {
      return index === 0
        ? getSecondaryIndexTransform(rect.current)
        : getPrimaryIndexTransform(rect.current);
    }

    return transform;
  };

  const style = {
    transform: CSS.Transform.toString(getTransform()),
    transition,
    width: '100%',
    height: '100%',
    aspectRatio: '1/1',
    pointerEvents: isDragging ? 'none' : 'auto',
  } as CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-testid="sortable-grid-item"
    >
      {children ? children : <MediaFilePlaceholder />}
    </div>
  );
};
