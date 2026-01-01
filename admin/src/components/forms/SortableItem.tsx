import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const SortableItem = ({
  id,
  children,
  style: styleProp,
  type,
  data,
  disabled,
  name,
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
    data: {
      data,
      type,
    },
  });

  const style: React.CSSProperties = {
    ...styleProp,
    transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 9999, opacity: 0.5 } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid={`sortable-${name || 'item'}`}
    >
      {typeof children === 'function'
        ? children({
            isDragging,
          })
        : children}
    </div>
  );
};
