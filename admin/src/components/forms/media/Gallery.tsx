import { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

import { css } from '@emotion/react';
import { useFormContext } from 'react-hook-form';
import { MediaFileControl } from '@/components/media/control/MediaFileControl';
import { IMediaFile } from '@/domains/inventory/products/types';
import { MediaFilePlaceholder } from '@/components/media/control/Placeholder';
import { Box } from '@/components/utility/Box';
import { uniqBy } from 'lodash';
import { SortableGridItem } from '@/components/forms/media/Item';

export const Gallery = () => {
  const { watch, setValue } = useFormContext();

  const value = watch('gallery');
  const [activeId, setActiveId] = useState<string | null>(null);

  const gallery = useMemo(() => {
    return (value || []).filter((it: IMediaFile) => it?.id);
  }, [value]);

  const activeUrl = gallery.find((it: IMediaFile) => it.id === activeId)?.url;

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
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;

    if (over && active.id !== over.id) {
      const ids = gallery.map((it: IMediaFile) => it.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);

      setValue('gallery', arrayMove(gallery, oldIndex, newIndex), {
        shouldDirty: true,
      });
    }
  };

  const overlayItemsCount = useMemo(() => gallery.length + 1, [gallery.length]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
    >
      <div
        css={css`
          width: 100%;
          box-sizing: border-box;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          grid-gap: var(--x4);
          position: relative;

          & > *:nth-child(1) {
            grid-column-start: span 2;
            grid-row-start: span 2;
          }
        `}
      >
        <SortableContext
          items={gallery
            .filter((it: IMediaFile) => it?.id)
            .map((it: IMediaFile) => it.id)}
          strategy={rectSortingStrategy}
        >
          {gallery.map((it: IMediaFile, idx: number) => (
            <SortableGridItem key={it.id} id={it.id} index={idx} gap={16}>
              <MediaFileControl
                name={`gallery-${idx}`}
                file={it}
                multiple
                onClear={() => {
                  setValue(
                    'gallery',
                    gallery.filter((item: IMediaFile) => item.id !== it.id),
                    { shouldDirty: true },
                  );
                }}
              />
            </SortableGridItem>
          ))}
          <MediaFileControl
            name="gallery"
            multiple
            data-testid="gallery-upload-button"
            value={gallery}
            onChange={(files) => {
              setValue('gallery', uniqBy(files, 'id'), {
                shouldDirty: true,
              });
            }}
          />
          <Box
            css={css`
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              box-sizing: border-box;
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
              grid-gap: var(--x4);
              position: absolute;
              overflow: hidden;
              max-height: 240px;
              pointer-events: none;

              & > *:nth-child(1) {
                grid-column-start: span 2;
                grid-row-start: span 2;
              }
            `}
          >
            {new Array(overlayItemsCount).fill(1).map((_, idx) => (
              <div
                key={idx}
                css={css`
                  aspect-ratio: 1/1;
                `}
              />
            ))}
            {new Array(30).fill(1).map((_, idx) => (
              <MediaFilePlaceholder key={idx} />
            ))}
          </Box>
          {activeUrl ? <DragOverlay /> : null}
        </SortableContext>
      </div>
    </DndContext>
  );
};
