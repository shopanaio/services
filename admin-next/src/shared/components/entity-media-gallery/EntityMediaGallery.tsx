"use client";

import { useCallback, useState, CSSProperties } from "react";
import {
  Upload,
  Button,
  Typography,
  Tooltip,
  Dropdown,
  Flex,
  Empty,
  Space,
  Image,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  MoreOutlined,
  EyeOutlined,
  UploadOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  HolderOutlined,
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { syntheticId } from "@/utils/synthetic-id";
import { Paper } from "@/domains/inventory/products/components/Paper";
import { PaperHeader } from "@/domains/inventory/products/components/PaperHeader";
import { useStyles } from "./styles";
import type { IMediaItem, IEntityMediaGalleryProps, ViewMode } from "./types";

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

const getFileExtension = (name: string): string => {
  return name.split(".").pop()?.toUpperCase() || "";
};

// ============================================================================
// SortableGridItem Component
// ============================================================================

interface ISortableGridItemProps {
  item: IMediaItem;
  index: number;
  isCover: boolean;
  coverLabel: string;
  onSetCover: (item: IMediaItem) => void;
  onDelete: (id: string) => void;
  onPreview?: (item: IMediaItem, index: number) => void;
}

const SortableGridItem = ({
  item,
  index,
  isCover,
  coverLabel,
  onSetCover,
  onDelete,
  onPreview,
}: ISortableGridItemProps) => {
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

  const gap = 8;

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
          {coverLabel}
        </div>
      )}

      <img src={item.url} alt={item.name} className={styles.mediaImage} />

      <div className={cx(styles.mediaActions, "media-actions")}>
        <Dropdown
          menu={{
            items: [
              ...(onPreview
                ? [
                    {
                      key: "preview",
                      label: "Preview",
                      icon: <EyeOutlined />,
                      onClick: () => onPreview(item, index),
                    },
                  ]
                : []),
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

// ============================================================================
// SortableListItem Component
// ============================================================================

interface ISortableListItemProps {
  item: IMediaItem;
  index: number;
  isCover: boolean;
  coverLabel: string;
  onSetCover: (item: IMediaItem) => void;
  onDelete: (id: string) => void;
  onPreview?: (item: IMediaItem, index: number) => void;
}

const SortableListItem = ({
  item,
  index,
  isCover,
  coverLabel,
  onSetCover,
  onDelete,
  onPreview,
}: ISortableListItemProps) => {
  const { styles, cx } = useStyles();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const ext = item.ext || getFileExtension(item.name);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cx(styles.listItem, isDragging && styles.listItemDragging)}
    >
      <div className={styles.dragHandle}>
        <HolderOutlined />
      </div>

      <img src={item.url} alt={item.name} className={styles.listItemImage} />

      <div className={styles.listItemInfo}>
        <Typography.Text className={styles.listItemName}>
          {item.name}
        </Typography.Text>
        <div className={styles.listItemMeta}>
          <span>{formatFileSize(item.size)}</span>
          {ext && <span>{ext}</span>}
          {isCover && (
            <Typography.Text type="success" style={{ fontSize: 12 }}>
              <StarFilled style={{ marginRight: 4 }} />
              {coverLabel}
            </Typography.Text>
          )}
        </div>
      </div>

      <div className={styles.listItemActions}>
        {onPreview && (
          <Tooltip title="Preview">
            <Button
              size="small"
              type="text"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onPreview(item, index);
              }}
            />
          </Tooltip>
        )}

        {!isCover && (
          <Tooltip title="Set as cover">
            <Button
              size="small"
              type="text"
              icon={<StarOutlined />}
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
              ...(onPreview
                ? [
                    {
                      key: "preview",
                      label: "Preview",
                      icon: <EyeOutlined />,
                      onClick: () => onPreview(item, index),
                    },
                  ]
                : []),
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
            type="text"
            icon={<MoreOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      </div>
    </div>
  );
};

// ============================================================================
// ListItemPreview (for DragOverlay)
// ============================================================================

interface IListItemPreviewProps {
  item: IMediaItem;
  isCover: boolean;
  coverLabel: string;
}

const ListItemPreview = ({
  item,
  isCover,
  coverLabel,
}: IListItemPreviewProps) => {
  const { styles } = useStyles();
  const ext = item.ext || getFileExtension(item.name);

  return (
    <div
      className={styles.listItem}
      style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)", cursor: "grabbing" }}
    >
      <div className={styles.dragHandle}>
        <HolderOutlined />
      </div>
      <img src={item.url} alt={item.name} className={styles.listItemImage} />
      <div className={styles.listItemInfo}>
        <Typography.Text className={styles.listItemName}>
          {item.name}
        </Typography.Text>
        <div className={styles.listItemMeta}>
          <span>{formatFileSize(item.size)}</span>
          {ext && <span>{ext}</span>}
          {isCover && (
            <Typography.Text type="success" style={{ fontSize: 12 }}>
              <StarFilled style={{ marginRight: 4 }} />
              {coverLabel}
            </Typography.Text>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const EntityMediaGallery = ({
  value,
  onChange,
  viewMode: controlledViewMode,
  onViewModeChange,
  showViewSwitcher = false,
  showUpload = true,
  onUpload,
  onPreview: externalOnPreview,
  accept = "image/*",
  multiple = true,
  emptyMessage = "No media files yet",
  coverLabel = "Cover",
  hasCover = true,
  minCells = 13,
  title,
  showPaper = false,
}: IEntityMediaGalleryProps) => {
  const { styles } = useStyles();
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>("grid");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewCurrent, setPreviewCurrent] = useState(0);

  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  const activeItem = value.find((it) => it.id === activeId);
  const activeIndex = activeItem ? value.indexOf(activeItem) : -1;

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
      const ids = value.map((it) => it.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);

      onChange(arrayMove(value, oldIndex, newIndex));
    }
  };

  const handleSetCover = useCallback(
    (item: IMediaItem) => {
      const filtered = value.filter((i) => i.id !== item.id);
      onChange([item, ...filtered]);
    },
    [value, onChange]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const item = value.find((m) => m.id === id);
      // Revoke object URL if it's a local file
      if (item?.file) {
        URL.revokeObjectURL(item.url);
      }
      onChange(value.filter((m) => m.id !== id));
    },
    [value, onChange]
  );

  const handlePreview = useCallback(
    (item: IMediaItem, index: number) => {
      if (externalOnPreview) {
        externalOnPreview(item, index);
      } else {
        setPreviewCurrent(index);
        setPreviewVisible(true);
      }
    },
    [externalOnPreview]
  );

  const handleUpload = useCallback(
    async (file: File, fileList: File[]) => {
      // Process all files only once (when we hit the last file)
      if (file === fileList[fileList.length - 1]) {
        const files = fileList as File[];
        if (onUpload) {
          const newItems = await onUpload(files);
          onChange([...value, ...newItems]);
        } else {
          const newItems: IMediaItem[] = files.map((f) => ({
            id: syntheticId(),
            file: f,
            url: URL.createObjectURL(f),
            name: f.name,
            size: f.size,
            ext: f.name.split(".").pop() || "",
          }));
          onChange([...value, ...newItems]);
        }
      }
      return false;
    },
    [value, onChange, onUpload]
  );

  const hasMedia = value.length > 0;

  const Wrapper = showPaper ? Paper : "div";

  const renderHeader = () => {
    if (!showViewSwitcher || !hasMedia) return null;

    return (
      <Flex
        justify="space-between"
        align="center"
        style={{ marginBottom: 12 }}
      >
        <Typography.Text type="secondary">
          {value.length} file{value.length !== 1 ? "s" : ""}
        </Typography.Text>
        <Flex gap={8} align="center">
          {showUpload && (
            <Upload
              accept={accept}
              multiple={multiple}
              showUploadList={false}
              beforeUpload={handleUpload}
            >
              <Button size="small" icon={<UploadOutlined />}>
                Upload
              </Button>
            </Upload>
          )}
          <Space.Compact size="small">
            <Button
              type={viewMode === "grid" ? "primary" : "default"}
              icon={<AppstoreOutlined />}
              onClick={() => setViewMode("grid")}
            />
            <Button
              type={viewMode === "list" ? "primary" : "default"}
              icon={<UnorderedListOutlined />}
              onClick={() => setViewMode("list")}
            />
          </Space.Compact>
        </Flex>
      </Flex>
    );
  };

  return (
    <Wrapper>
      {showPaper && title && <PaperHeader title={title} />}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {renderHeader()}

        {/* Empty state with dragger (only when no minCells) */}
        {!hasMedia && showUpload && (
          <Upload.Dragger
            accept={accept}
            multiple={multiple}
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

        {/* Empty state without upload */}
        {!hasMedia && !showUpload && (
          <div className={styles.emptyContainer}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={emptyMessage}
            />
          </div>
        )}

        {/* Grid view */}
        {hasMedia && viewMode === "grid" && (
          <>
            <div className={styles.mediaGrid}>
              <SortableContext
                items={value.map((it) => it.id)}
                strategy={rectSortingStrategy}
              >
                {value.map((item, idx) => (
                  <SortableGridItem
                    key={item.id}
                    item={item}
                    index={idx}
                    isCover={hasCover && idx === 0}
                    coverLabel={coverLabel}
                    onSetCover={handleSetCover}
                    onDelete={handleDelete}
                    onPreview={handlePreview}
                  />
                ))}
              </SortableContext>

              {showUpload && (
                <div className={styles.uploadCell}>
                  <Upload
                    accept={accept}
                    multiple={multiple}
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
              )}

              {/* Overlay with placeholder cells */}
              <div className={styles.mediaGridOverlay}>
                {Array.from({
                  length: value.length + (showUpload ? 1 : 0),
                }).map((_, idx) => (
                  <div key={`spacer-${idx}`} className={styles.spacerCell} />
                ))}
                {Array.from({
                  length: Math.max(
                    0,
                    minCells - value.length - (showUpload ? 1 : 0)
                  ),
                }).map((_, idx) => (
                  <div
                    key={`placeholder-${idx}`}
                    className={styles.placeholderCell}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* List view */}
        {hasMedia && viewMode === "list" && (
          <div className={styles.listContainer}>
            <SortableContext
              items={value.map((it) => it.id)}
              strategy={verticalListSortingStrategy}
            >
              {value.map((item, idx) => (
                <SortableListItem
                  key={item.id}
                  item={item}
                  index={idx}
                  isCover={hasCover && idx === 0}
                  coverLabel={coverLabel}
                  onSetCover={handleSetCover}
                  onDelete={handleDelete}
                  onPreview={handlePreview}
                />
              ))}
            </SortableContext>
          </div>
        )}

        <DragOverlay>
          {activeItem && viewMode === "list" ? (
            <ListItemPreview
              item={activeItem}
              isCover={hasCover && activeIndex === 0}
              coverLabel={coverLabel}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Built-in preview if no external handler */}
      {!externalOnPreview && (
        <Image.PreviewGroup
          preview={{
            visible: previewVisible,
            current: previewCurrent,
            onVisibleChange: (v) => setPreviewVisible(v),
            onChange: (current) => setPreviewCurrent(current),
          }}
          items={value.map((item) => ({
            src: item.url,
            alt: item.name,
          }))}
        />
      )}
    </Wrapper>
  );
};
