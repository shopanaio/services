"use client";

import { useCallback, useState, CSSProperties } from "react";
import { Upload, Button, Typography, Tooltip, Dropdown, Flex } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  MoreOutlined,
  UploadOutlined,
} from "@ant-design/icons";
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
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createStyles } from "antd-style";
import { Paper } from "../../components/Paper";
import { PaperHeader } from "../../components/PaperHeader";
import type { ISectionProps, ILocalMediaItem } from "./types";

const useStyles = createStyles(({ token }) => ({
  mediaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
    gridGap: 16,
    position: "relative",
    "& > *:nth-child(1)": {
      gridColumnStart: "span 2",
      gridRowStart: "span 2",
    },
  },
  mediaItem: {
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    aspectRatio: "1/1",
    cursor: "grab",
    "&:hover": {
      borderColor: token.colorPrimary,
    },
    "&:hover .media-actions": {
      opacity: 1,
    },
  },
  mediaItemDragging: {
    opacity: 0.5,
  },
  mediaImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  mediaActions: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    opacity: 0,
    transition: "opacity 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mediaActionButton: {
    color: "#fff",
    background: "rgba(0, 0, 0, 0.4)",
    border: "none",
    "&:hover": {
      color: "#fff",
      background: "rgba(0, 0, 0, 0.6)",
    },
  },
  coverBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    background: token.colorPrimary,
    color: "#fff",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: 4,
    zIndex: 1,
  },
  uploadArea: {
    width: "100%",
    aspectRatio: "1/1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: token.colorBgLayout,
    border: `2px dashed ${token.colorBorder}`,
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: token.colorPrimary,
      background: token.colorPrimaryBg,
    },
  },
  uploadIcon: {
    fontSize: 24,
    color: token.colorTextSecondary,
    marginBottom: 8,
  },
  draggerIcon: {
    fontSize: 24,
    color: token.colorIcon,
    marginBottom: token.marginXS,
  },
  draggerTitle: {
    fontSize: token.fontSizeLG,
  },
  uploadText: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  fileInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "4px 8px",
    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
    color: "#fff",
    fontSize: 10,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    fontSize: 12,
    color: token.colorTextSecondary,
  },
}));

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

// Sortable Media Item Component
interface ISortableMediaItemProps {
  item: ILocalMediaItem;
  index: number;
  onSetCover: (item: ILocalMediaItem) => void;
  onDelete: (id: string) => void;
}

const SortableMediaItem = ({
  item,
  index,
  onSetCover,
  onDelete,
}: ISortableMediaItemProps) => {
  const { styles, cx } = useStyles();
  const isCover = index === 0;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    activeIndex,
    overIndex,
    rect,
  } = useSortable({ id: item.id });

  const gap = 16;

  const getTransform = () => {
    if (!transform || !rect.current) {
      return transform;
    }

    const getPrimaryIndexTransform = (r: {
      width: number;
      height: number;
    }) => ({
      ...transform,
      x: (transform?.x || 0) + r.width / 2 + gap / 2,
      y: (transform?.y || 0) + r.height / 2 + gap / 2,
    });

    const getSecondaryIndexTransform = (r: {
      width: number;
      height: number;
    }) => ({
      ...transform,
      x: (transform?.x || 0) - r.width / 4 - gap / 4,
      y: (transform?.y || 0) - r.height / 4 - gap / 4,
    });

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

  const style: CSSProperties = {
    transform: CSS.Transform.toString(getTransform()),
    transition,
    width: "100%",
    height: "100%",
    aspectRatio: "1/1",
    pointerEvents: isDragging ? "none" : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cx(styles.mediaItem, isDragging && styles.mediaItemDragging)}
    >
      {isCover && (
        <div className={styles.coverBadge}>
          <StarFilled style={{ fontSize: 10 }} />
          Cover
        </div>
      )}

      <img src={item.url} alt={item.name} className={styles.mediaImage} />

      <div className={cx(styles.mediaActions, "media-actions")}>
        {!isCover && (
          <Tooltip title="Set as cover">
            <Button
              size="small"
              shape="circle"
              icon={<StarOutlined />}
              className={styles.mediaActionButton}
              onClick={(e) => {
                e.stopPropagation();
                onSetCover(item);
              }}
            />
          </Tooltip>
        )}

        <Dropdown
          menu={{
            items: [
              ...(isCover
                ? []
                : [
                    {
                      key: "setCover",
                      label: "Set as cover",
                      icon: <StarOutlined />,
                      onClick: () => onSetCover(item),
                    },
                  ]),
              { type: "divider" as const },
              {
                key: "delete",
                label: "Delete",
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => onDelete(item.id),
              },
            ],
          }}
          trigger={["click"]}
        >
          <Button
            size="small"
            shape="circle"
            icon={<MoreOutlined />}
            className={styles.mediaActionButton}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      </div>

      <div className={styles.fileInfo}>
        {item.name} - {formatFileSize(item.size)}
      </div>
    </div>
  );
};

export const MediaSection = ({ formState, updateFormState }: ISectionProps) => {
  const { styles } = useStyles();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (!event?.active?.id) return;
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = formState.media.map((it) => it.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);

      updateFormState("media", arrayMove(formState.media, oldIndex, newIndex));
    }
  };

  const handleSetCover = useCallback(
    (item: ILocalMediaItem) => {
      const filtered = formState.media.filter((i) => i.id !== item.id);
      updateFormState("media", [item, ...filtered]);
    },
    [formState.media, updateFormState]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const item = formState.media.find((m) => m.id === id);
      if (item) {
        URL.revokeObjectURL(item.url);
      }
      updateFormState(
        "media",
        formState.media.filter((m) => m.id !== id)
      );
    },
    [formState.media, updateFormState]
  );

  const handleUpload = useCallback(
    (file: File) => {
      const newItem: ILocalMediaItem = {
        id: `media-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 11)}`,
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        isCover: formState.media.length === 0,
      };

      updateFormState("media", [...formState.media, newItem]);
      return false; // Prevent default upload behavior
    },
    [formState.media, updateFormState]
  );

  const hasMedia = formState.media.length > 0;

  return (
    <Paper>
      <PaperHeader
        title="Media"
        actions={
          hasMedia && (
            <Upload
              accept="image/*"
              multiple
              showUploadList={false}
              beforeUpload={handleUpload}
            >
              <Button size="small" icon={<PlusOutlined />}>
                Upload
              </Button>
            </Upload>
          )
        }
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {!hasMedia && (
          <Upload.Dragger
            accept="image/*"
            multiple
            showUploadList={false}
            beforeUpload={handleUpload}
          >
            <Flex align="center" justify="center" vertical>
              <UploadOutlined className={styles.draggerIcon} />
              <Typography.Text
                strong
                type="secondary"
                className={styles.draggerTitle}
              >
                Upload images
              </Typography.Text>
              <Typography.Text type="secondary">
                Drag and drop images here or click to upload.
              </Typography.Text>
            </Flex>
          </Upload.Dragger>
        )}

        {hasMedia && (
          <>
            <div className={styles.mediaGrid}>
              <SortableContext
                items={formState.media.map((it) => it.id)}
                strategy={rectSortingStrategy}
              >
                {formState.media.map((item, idx) => (
                  <SortableMediaItem
                    key={item.id}
                    item={item}
                    index={idx}
                    onSetCover={handleSetCover}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>

              <Upload
                accept="image/*"
                multiple
                showUploadList={false}
                beforeUpload={handleUpload}
              >
                <div className={styles.uploadArea}>
                  <PlusOutlined className={styles.uploadIcon} />
                  <Typography.Text className={styles.uploadText}>
                    Upload
                  </Typography.Text>
                </div>
              </Upload>
            </div>

            <div className={styles.footer}>
              <span>
                {formState.media.length} image
                {formState.media.length !== 1 ? "s" : ""}
              </span>
              <span>Drag to reorder</span>
            </div>
          </>
        )}

        <DragOverlay />
      </DndContext>
    </Paper>
  );
};
