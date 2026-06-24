"use client";

import { useCallback, useMemo, useState, CSSProperties } from "react";
import {
  Button,
  Checkbox,
  Typography,
  Tooltip,
  Dropdown,
  Flex,
  Empty,
  Space,
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
  FolderOpenOutlined,
} from "@ant-design/icons";
import { FeaturedBadge } from "@/ui-kit/featured-badge";
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
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useUploadMediaModal } from "@/domains/media/modals";
import { useMediaPicker } from "@/shared/components/entity-picker-modal";
import { MediaPreview } from "../media-preview";
import { useStyles } from "./styles";
import type { IEntityMediaGalleryProps, ViewMode } from "./types";
import type { ApiFile } from "@/graphql/types";

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

const getFileName = (file: ApiFile): string => file.originalName || file.id;
const getFileSize = (file: ApiFile): number => Number(file.sizeBytes) || 0;
const getFileExt = (file: ApiFile): string => file.ext?.toUpperCase() || "";

// ============================================================================
// SortableGridItem Component
// ============================================================================

interface ISortableGridItemProps {
  item: ApiFile;
  index: number;
  isFeatured: boolean;
  onSetFeatured: (item: ApiFile) => void;
  onDelete: (id: string) => void;
  onPreview?: (item: ApiFile, index: number) => void;
  allowDelete: boolean;
  allowSetFeatured: boolean;
  selectionMode: boolean;
  selected: boolean;
  onSelectedChange: (id: string, selected: boolean) => void;
}

const SortableGridItem = ({
  item,
  index,
  isFeatured,
  onSetFeatured,
  onDelete,
  onPreview,
  allowDelete,
  allowSetFeatured,
  selectionMode,
  selected,
  onSelectedChange,
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

  const name = getFileName(item);
  const actionItems = [
    ...(onPreview
      ? [
          {
            key: "preview",
            label: "Preview",
            icon: <EyeOutlined />,
            "data-testid": `entity-media-preview-menu-item-${item.id}`,
            onClick: () => onPreview(item, index),
          },
        ]
      : []),
    ...(allowSetFeatured && !isFeatured
      ? [
          {
            key: "setFeatured",
            label: "Set as featured",
            icon: <StarOutlined />,
            "data-testid": `entity-media-set-featured-menu-item-${item.id}`,
            onClick: () => onSetFeatured(item),
          },
        ]
      : []),
    ...(allowDelete
      ? [
          { type: "divider" as const },
          {
            key: "delete",
            label: "Delete",
            icon: <DeleteOutlined />,
            danger: true,
            "data-testid": `entity-media-delete-menu-item-${item.id}`,
            onClick: () => onDelete(item.id),
          },
        ]
      : []),
  ];
  const handleItemClick = () => {
    if (!selectionMode) {
      return;
    }

    onSelectedChange(item.id, !selected);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cx(
        styles.mediaItem,
        selected && styles.mediaItemSelected,
        isDragging && styles.mediaItemDragging,
      )}
      data-testid={`entity-media-grid-item-${item.id}`}
      onClick={handleItemClick}
    >
      {isFeatured && <FeaturedBadge />}

      {selectionMode && (
        <div
          className={styles.selectionCheckbox}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            data-testid={`entity-media-select-checkbox-${item.id}`}
            onChange={(event) =>
              onSelectedChange(item.id, event.target.checked)
            }
          />
        </div>
      )}

      <img src={item.url} alt={name} className={styles.mediaImage} />

      {actionItems.length > 0 && (
        <div className={cx(styles.mediaActions, "media-actions")}>
        <Dropdown
          menu={{
            items: actionItems,
          }}
          trigger={["click"]}
        >
          <Button
            size="small"
            shape="circle"
            icon={<MoreOutlined />}
            data-testid={`entity-media-actions-button-${item.id}`}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
        </div>
      )}

      <div className={styles.fileInfo}>
        {name} - {formatFileSize(getFileSize(item))}
      </div>
    </div>
  );
};

// ============================================================================
// SortableListItem Component
// ============================================================================

interface ISortableListItemProps {
  item: ApiFile;
  index: number;
  isFeatured: boolean;
  featuredLabel: string;
  onSetFeatured: (item: ApiFile) => void;
  onDelete: (id: string) => void;
  onPreview?: (item: ApiFile, index: number) => void;
  allowDelete: boolean;
  allowSetFeatured: boolean;
  selectionMode: boolean;
  selected: boolean;
  onSelectedChange: (id: string, selected: boolean) => void;
}

const SortableListItem = ({
  item,
  index,
  isFeatured,
  featuredLabel,
  onSetFeatured,
  onDelete,
  onPreview,
  allowDelete,
  allowSetFeatured,
  selectionMode,
  selected,
  onSelectedChange,
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

  const name = getFileName(item);
  const ext = getFileExt(item);
  const handleItemClick = () => {
    if (!selectionMode) {
      return;
    }

    onSelectedChange(item.id, !selected);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cx(
        styles.listItem,
        selected && styles.listItemSelected,
        isDragging && styles.listItemDragging,
      )}
      data-testid={`entity-media-list-item-${item.id}`}
      onClick={handleItemClick}
    >
      {selectionMode && (
        <div
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            data-testid={`entity-media-select-checkbox-${item.id}`}
            onChange={(event) =>
              onSelectedChange(item.id, event.target.checked)
            }
          />
        </div>
      )}

      <div className={styles.dragHandle}>
        <HolderOutlined />
      </div>

      <img src={item.url} alt={name} className={styles.listItemImage} />

      <div className={styles.listItemInfo}>
        <Typography.Text className={styles.listItemName}>
          {name}
        </Typography.Text>
        <div className={styles.listItemMeta}>
          <span>{formatFileSize(getFileSize(item))}</span>
          {ext && <span>{ext}</span>}
          {isFeatured && (
            <Typography.Text type="success" style={{ fontSize: 12 }}>
              <StarFilled style={{ marginRight: 4 }} />
              {featuredLabel}
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
              data-testid={`entity-media-preview-button-${item.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onPreview(item, index);
              }}
            />
          </Tooltip>
        )}

        {allowSetFeatured && !isFeatured && (
          <Tooltip title="Set as featured">
            <Button
              size="small"
              type="text"
              icon={<StarOutlined />}
              data-testid={`entity-media-set-featured-button-${item.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onSetFeatured(item);
              }}
            />
          </Tooltip>
        )}

        {allowDelete && (
          <Tooltip title="Delete">
            <Button
              size="small"
              type="text"
              icon={<DeleteOutlined />}
              data-testid={`entity-media-delete-button-${item.id}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// ListItemPreview (for DragOverlay)
// ============================================================================

interface IListItemPreviewProps {
  item: ApiFile;
  isFeatured: boolean;
  featuredLabel: string;
  selectionMode: boolean;
  selected: boolean;
}

const ListItemPreview = ({
  item,
  isFeatured,
  featuredLabel,
  selectionMode,
  selected,
}: IListItemPreviewProps) => {
  const { styles } = useStyles();
  const name = getFileName(item);
  const ext = getFileExt(item);

  return (
    <div
      className={styles.listItem}
      style={{
        boxShadow: "var(--ant-box-shadow-secondary)",
        cursor: "grabbing",
      }}
    >
      {selectionMode && <Checkbox checked={selected} />}
      <div className={styles.dragHandle}>
        <HolderOutlined />
      </div>
      <img src={item.url} alt={name} className={styles.listItemImage} />
      <div className={styles.listItemInfo}>
        <Typography.Text className={styles.listItemName}>
          {name}
        </Typography.Text>
        <div className={styles.listItemMeta}>
          <span>{formatFileSize(getFileSize(item))}</span>
          {ext && <span>{ext}</span>}
          {isFeatured && (
            <Typography.Text type="success" style={{ fontSize: 12 }}>
              <StarFilled style={{ marginRight: 4 }} />
              {featuredLabel}
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
  allowDelete = true,
  allowSetFeatured = true,
  selectionMode = false,
  selectedIds = [],
  onSelectedIdsChange,
  onPreview: externalOnPreview,
  accept = "image/*",
  emptyMessage = "No media files yet",
  featuredLabel = "Featured",
  hasFeatured = true,
  minCells = 13,
  title,
}: IEntityMediaGalleryProps) => {
  const { styles } = useStyles();
  const { push: openUploadModal } = useUploadMediaModal();
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>("grid");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewCurrent, setPreviewCurrent] = useState(0);

  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Handle files selected from media picker
  const handleMediaPickerConfirm = useCallback((files: ApiFile[]) => {
    onChange([...value, ...files]);
  }, [value, onChange]);

  // Media picker hook
  const { openPicker: openMediaPicker } = useMediaPicker({
    accept,
    onConfirm: handleMediaPickerConfirm,
    excludeIds: value.map((item) => item.id),
  });

  // Handle files uploaded from upload modal
  const handleUploadModalConfirm = useCallback((files: ApiFile[]) => {
    onChange([...value, ...files]);
  }, [value, onChange]);

  // Open upload modal handler
  const handleOpenUploadModal = useCallback(() => {
    openUploadModal({
      accept,
      onUpload: handleUploadModalConfirm,
    });
  }, [openUploadModal, accept, handleUploadModalConfirm]);

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

  const handleSetFeatured = useCallback(
    (item: ApiFile) => {
      const filtered = value.filter((i) => i.id !== item.id);
      onChange([item, ...filtered]);
    },
    [value, onChange]
  );

  const handleDelete = useCallback(
    (id: string) => {
      onChange(value.filter((m) => m.id !== id));
    },
    [value, onChange]
  );

  const handleSelectedChange = useCallback(
    (id: string, selected: boolean) => {
      if (!onSelectedIdsChange) {
        return;
      }

      const nextIds = selected
        ? Array.from(new Set([...selectedIds, id]))
        : selectedIds.filter((selectedId) => selectedId !== id);

      onSelectedIdsChange(nextIds);
    },
    [onSelectedIdsChange, selectedIds],
  );

  const handlePreview = useCallback(
    (item: ApiFile, index: number) => {
      if (externalOnPreview) {
        externalOnPreview(item, index);
      } else {
        setPreviewCurrent(index);
        setPreviewVisible(true);
      }
    },
    [externalOnPreview]
  );

  const hasMedia = value.length > 0;

  const renderHeader = () => {
    if ((!showViewSwitcher && !showUpload) || !hasMedia) return null;

    return (
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <Typography.Text type="secondary">
          {value.length} file{value.length !== 1 ? "s" : ""}
        </Typography.Text>
        <Flex gap={8} align="center">
          {showUpload && (
            <Button size="small" icon={<FolderOpenOutlined />} onClick={openMediaPicker}>
              Browse
            </Button>
          )}
          {showViewSwitcher && (
            <Space.Compact size="small">
              <Button
                type={viewMode === "grid" ? "primary" : "default"}
                icon={<AppstoreOutlined />}
                data-testid="entity-media-grid-view-button"
                onClick={() => setViewMode("grid")}
              />
              <Button
                type={viewMode === "list" ? "primary" : "default"}
                icon={<UnorderedListOutlined />}
                data-testid="entity-media-list-view-button"
                onClick={() => setViewMode("list")}
              />
            </Space.Compact>
          )}
        </Flex>
      </Flex>
    );
  };

  return (
    <Paper>
      {title && <PaperHeader title={title} />}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {renderHeader()}

        {/* Empty state with upload button */}
        {!hasMedia && showUpload && (
          <div
            className={styles.emptyUploadArea}
            data-testid="entity-media-empty-upload-area"
            onClick={handleOpenUploadModal}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleOpenUploadModal();
              }
            }}
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
                Click to upload images
              </Typography.Text>
            </Flex>
          </div>
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
                    isFeatured={hasFeatured && idx === 0}
                    onSetFeatured={handleSetFeatured}
                    onDelete={handleDelete}
                    onPreview={handlePreview}
                    allowDelete={allowDelete}
                    allowSetFeatured={allowSetFeatured}
                    selectionMode={selectionMode}
                    selected={selectedIdSet.has(item.id)}
                    onSelectedChange={handleSelectedChange}
                  />
                ))}
              </SortableContext>

              {showUpload && (
                <div className={styles.uploadCell}>
                  <div
                    className={styles.uploadArea}
                    data-testid="entity-media-upload-area"
                    onClick={handleOpenUploadModal}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleOpenUploadModal();
                      }
                    }}
                  >
                    <PlusOutlined className={styles.uploadIcon} />
                    <Typography.Text className={styles.uploadText}>
                      Upload
                    </Typography.Text>
                  </div>
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
                  isFeatured={hasFeatured && idx === 0}
                  featuredLabel={featuredLabel}
                  onSetFeatured={handleSetFeatured}
                  onDelete={handleDelete}
                  onPreview={handlePreview}
                  allowDelete={allowDelete}
                  allowSetFeatured={allowSetFeatured}
                  selectionMode={selectionMode}
                  selected={selectedIdSet.has(item.id)}
                  onSelectedChange={handleSelectedChange}
                />
              ))}
            </SortableContext>
          </div>
        )}

        <DragOverlay>
          {activeItem && viewMode === "list" ? (
            <ListItemPreview
              item={activeItem}
              isFeatured={hasFeatured && activeIndex === 0}
              featuredLabel={featuredLabel}
              selectionMode={selectionMode}
              selected={selectedIdSet.has(activeItem.id)}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Built-in preview if no external handler */}
      {!externalOnPreview && (
        <MediaPreview
          items={value}
          visible={previewVisible}
          currentIndex={previewCurrent}
          onClose={() => setPreviewVisible(false)}
          onIndexChange={setPreviewCurrent}
        />
      )}
    </Paper>
  );
};
