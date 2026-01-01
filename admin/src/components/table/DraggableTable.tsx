import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { TableProps } from 'antd';
import { DraggableTableNoContext } from '@components/table/DraggableTableNoContext';

interface DraggableTableProps<T = any> extends TableProps<T> {
  setDataSource: (dataSource: T[], id: ID) => void;
  sortableItems?: T[];
  isDraggable?: boolean;
}

export const DraggableTable = ({
  setDataSource,
  dataSource,
  isDraggable,
  columns,
  ...props
}: DraggableTableProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // https://docs.dndkit.com/api-documentation/sensors/pointer#activation-constraints
        distance: 1,
      },
    }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!dataSource) {
      return;
    }

    if (active.id !== over?.id) {
      const activeIndex = dataSource.findIndex((i) => i.id === active.id);
      const overIndex = dataSource.findIndex((i) => i.id === over?.id);
      setDataSource(
        arrayMove(dataSource as any[], activeIndex, overIndex),
        active.id as string,
      );
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <DraggableTableNoContext
        {...props}
        isDraggable={isDraggable}
        dataSource={dataSource}
        columns={columns}
      />
    </DndContext>
  );
};
