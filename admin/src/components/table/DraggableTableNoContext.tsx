import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { useCallback, useRef } from 'react';
import { Table, TableProps } from 'antd';
import { mapEntryId } from '@src/utils/utils';

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': ID;
  record: any;
}

const Row = ({ record, ...props }: RowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props['data-row-key'],
    data: {
      data: record,
      type: 'TableRow',
    },
  });

  const ref = useRef<HTMLTableRowElement | null>(null);

  const setRef = useCallback((node: any) => {
    ref.current = node;
    setNodeRef(node);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
    transition,
    ...(isDragging
      ? {
          opacity: 0.5,
          position: 'relative',
          zIndex: 9999,
        }
      : {}),
  };

  return (
    <>
      <tr
        {...props}
        ref={setRef}
        style={style}
        {...attributes}
        {...listeners}
      />
    </>
  );
};

interface DraggableTableProps<T = any> extends TableProps<T> {
  isDraggable?: boolean;
  sortableItems?: string[];
}

export const DraggableTableNoContext = ({
  dataSource,
  isDraggable,
  sortableItems,
  ...props
}: DraggableTableProps) => {
  const data = (dataSource || [])?.filter((it) => it?.id);

  return (
    <SortableContext
      items={sortableItems || data.map(mapEntryId)}
      strategy={verticalListSortingStrategy}
      disabled={isDraggable === false}
    >
      <Table
        {...props}
        components={{
          body: {
            row: Row,
          },
        }}
        rowKey="id"
        dataSource={data}
      />
    </SortableContext>
  );
};
