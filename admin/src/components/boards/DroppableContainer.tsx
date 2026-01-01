import { CSS } from '@dnd-kit/utilities';
import { Container, ContainerProps } from '@components/boards/Container';
import { UniqueIdentifier } from '@dnd-kit/core';
import {
  AnimateLayoutChanges,
  defaultAnimateLayoutChanges,
  useSortable,
} from '@dnd-kit/sortable';
import { IRenderColumn } from '@components/boards/Container/Container';

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

export function DroppableContainer({
  children,
  disabled,
  id,
  items,
  renderColumn,
  index,
  ...props
}: ContainerProps & {
  disabled?: boolean;
  id: UniqueIdentifier;
  items: UniqueIdentifier[];
  index: number;
  renderColumn: IRenderColumn;
}) {
  const {
    active,
    attributes,
    isDragging,
    listeners,
    over,
    setNodeRef,
    transition,
    transform,
  } = useSortable({
    id,
    disabled,
    data: {
      type: 'container',
      children: items,
      index,
    },
    animateLayoutChanges,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isOverContainer = over
    ? (id === over.id && active?.data.current?.type !== 'container') ||
      items.includes(over.id)
    : false;

  return (
    <Container
      ref={disabled ? undefined : setNodeRef}
      style={{
        transition,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : undefined,
      }}
      handleProps={{
        ...attributes,
        ...listeners,
      }}
      renderColumn={renderColumn}
      disabled={disabled}
      {...props}
    >
      {children}
    </Container>
  );
}
