"use client";

import { useState, useEffect, useCallback, useMemo, CSSProperties } from "react";
import { createStyles } from "antd-style";
import {
  Upload,
  Image,
  Button,
  Typography,
  Flex,
  Tooltip,
  Empty,
  Dropdown,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  MoreOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
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
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper } from "../components/Paper";
import { PaperHeader } from "../components/PaperHeader";
import type { IEditMediaModalPayload } from "../modals";
import type { IMediaFile } from "../mocks/types";
import { FileDriver } from "../mocks/types";

interface UploadRequestOption {
  file: File | Blob | string;
  onSuccess?: (body: unknown) => void;
  onError?: (error: Error) => void;
  onProgress?: (event: { percent: number }) => void;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    height: "100%",
    padding: 16,
  },
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
  mediaItemCover: {
    borderColor: token.colorPrimary,
    borderWidth: 2,
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
  uploadText: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  emptyContainer: {
    gridColumn: "1 / -1",
    padding: "40px 20px",
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
  selectedCount: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  bulkActions: {
    display: "flex",
    gap: 8,
  },
}));

// ============================================================================
// Helpers
// ============================================================================

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

// ============================================================================
// SortableMediaItem Component
// ============================================================================

interface ISortableMediaItemProps {
  item: IMediaFile;
  isCover: boolean;
  index: number;
  onSetCover: (item: IMediaFile) => void;
  onDelete: (id: string) => void;
  onPreview: (url: string) => void;
}

const SortableMediaItem = ({
  item,
  isCover,
  index,
  onSetCover,
  onDelete,
  onPreview,
}: ISortableMediaItemProps) => {
  const { styles, cx } = useStyles();
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

    const getPrimaryIndexTransform = (r: { width: number; height: number }) => ({
      ...transform,
      x: (transform?.x || 0) + r.width / 2 + gap / 2,
      y: (transform?.y || 0) + r.height / 2 + gap / 2,
    });

    const getSecondaryIndexTransform = (r: { width: number; height: number }) => ({
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
      className={cx(
        styles.mediaItem,
        isCover && styles.mediaItemCover,
        isDragging && styles.mediaItemDragging
      )}
    >
      {isCover && (
        <div className={styles.coverBadge}>
          <StarFilled style={{ fontSize: 10 }} />
          Cover
        </div>
      )}

      <img src={item.url} alt={item.name} className={styles.mediaImage} />

      <div className={cx(styles.mediaActions, "media-actions")}>
        <Tooltip title="Preview">
          <Button
            size="small"
            shape="circle"
            icon={<EyeOutlined />}
            className={styles.mediaActionButton}
            onClick={(e) => {
              e.stopPropagation();
              onPreview(item.url);
            }}
          />
        </Tooltip>

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
              {
                key: "preview",
                label: "Preview",
                icon: <EyeOutlined />,
                onClick: () => onPreview(item.url),
              },
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
        {item.name} • {formatFileSize(item.size)}
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const EditMediaModal = () => {
  const { styles } = useStyles();
  const { payload, pop, setDirty } = useModalStackContext();
  const typedPayload = payload as IEditMediaModalPayload;

  const [gallery, setGallery] = useState<IMediaFile[]>(() => {
    const items = [...typedPayload.gallery];
    if (typedPayload.cover && !items.find((i) => i.id === typedPayload.cover?.id)) {
      items.unshift(typedPayload.cover);
    }
    return items;
  });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const cover = gallery[0] || null;
  const activeUrl = gallery.find((it) => it.id === activeId)?.url;

  const markDirty = useCallback(() => {
    setDirty(true);
  }, [setDirty]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
      const ids = gallery.map((it) => it.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);

      setGallery(arrayMove(gallery, oldIndex, newIndex));
      markDirty();
    }
  };

  const handleSave = useCallback(() => {
    const newCover = gallery[0] || null;
    typedPayload.onSave?.({ cover: newCover, gallery });
    pop();
  }, [typedPayload, gallery, pop]);

  const handleSetCover = useCallback(
    (item: IMediaFile) => {
      setGallery((prev) => {
        const filtered = prev.filter((i) => i.id !== item.id);
        return [item, ...filtered];
      });
      markDirty();
    },
    [markDirty]
  );

  const handleDelete = useCallback(
    (id: string) => {
      setGallery((prev) => prev.filter((item) => item.id !== id));
      markDirty();
    },
    [markDirty]
  );

  const handlePreview = useCallback((url: string) => {
    setPreviewImage(url);
    setPreviewVisible(true);
  }, []);

  // Upload handler
  const handleUploadChange: UploadProps["onChange"] = useCallback(
    async ({ fileList }: { fileList: UploadFile[] }) => {
      const newFiles = fileList
        .filter((file: UploadFile) => file.originFileObj && file.status === "done")
        .map((file: UploadFile) => file.originFileObj as File);

      if (newFiles.length > 0 && typedPayload.onUpload) {
        const uploadedMedia = await typedPayload.onUpload(newFiles);
        setGallery((prev) => [...prev, ...uploadedMedia]);
      }
    },
    [typedPayload]
  );

  // Mock upload for now
  const customUpload = useCallback(
    async (options: UploadRequestOption) => {
      const { file, onSuccess } = options;
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockFile = file as File;
      const mockMedia: IMediaFile = {
        id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: URL.createObjectURL(mockFile),
        name: mockFile.name,
        size: mockFile.size,
        ext: mockFile.name.split(".").pop() || "",
        driver: FileDriver.LOCAL,
        key: mockFile.name,
        createdAt: new Date().toISOString(),
      };

      setGallery((prev) => [...prev, mockMedia]);
      markDirty();
      onSuccess?.(mockMedia);
    },
    [markDirty]
  );

  return (
    <ModalLayout
      name="edit-media"
      header={
        <ModalHeader
          name="edit-media"
          title="Edit Media"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
          }}
        />
      }
    >
      <div className={styles.container}>
        <Paper>
          <PaperHeader
            title="Product Media"
            extra={
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {gallery.length} files
              </Typography.Text>
            }
          />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className={styles.mediaGrid}>
              {gallery.length === 0 && (
                <div className={styles.emptyContainer}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No media files yet"
                  />
                </div>
              )}

              <SortableContext
                items={gallery.map((it) => it.id)}
                strategy={rectSortingStrategy}
              >
                {gallery.map((item, idx) => (
                  <SortableMediaItem
                    key={item.id}
                    item={item}
                    isCover={idx === 0}
                    index={idx}
                    onSetCover={handleSetCover}
                    onDelete={handleDelete}
                    onPreview={handlePreview}
                  />
                ))}
              </SortableContext>

              {/* Upload area */}
              <Upload
                accept="image/*,video/*"
                multiple
                showUploadList={false}
                customRequest={customUpload}
                onChange={handleUploadChange}
              >
                <div className={styles.uploadArea}>
                  <PlusOutlined className={styles.uploadIcon} />
                  <Typography.Text className={styles.uploadText}>
                    Upload
                  </Typography.Text>
                </div>
              </Upload>
            </div>

            {activeUrl ? <DragOverlay /> : null}
          </DndContext>
        </Paper>
      </div>

      <Image
        style={{ display: "none" }}
        preview={{
          visible: previewVisible,
          src: previewImage,
          onVisibleChange: (value) => setPreviewVisible(value),
        }}
      />
    </ModalLayout>
  );
};
