"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Typography,
  Input,
  Empty,
  Tag,
  Checkbox,
  Divider,
  message,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  TagOutlined,
} from "@ant-design/icons";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper } from "../../components/paper";
import type { IEditTagsModalPayload, ITag } from "../../modals";
import { useStyles } from "./edit-tags-modal.styles";
import type { IEditTagsModalProps } from "./types";
import { mockTags } from "./mocks";

export type { IEditTagsModalProps };

export const EditTagsModal = () => {
  const { styles, cx } = useStyles();
  const { pop, setDirty, payload } = useModalStackContext();

  const {
    selectedTagIds: initialTagIds,
    availableTags = mockTags,
    onSave,
    onCreateTag,
  } = (payload as IEditTagsModalPayload) || {};

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialTagIds || []);
  const [isCreating, setIsCreating] = useState(false);

  const markDirty = useCallback(() => setDirty(true), [setDirty]);

  // Filter tags by search
  const filteredTags = useMemo(() => {
    if (!searchTerm) return availableTags;
    const term = searchTerm.toLowerCase();
    return availableTags.filter(
      (tag) =>
        tag.title.toLowerCase().includes(term) ||
        tag.slug.toLowerCase().includes(term)
    );
  }, [availableTags, searchTerm]);

  // Tag map for quick lookup
  const tagMap = useMemo(
    () => new Map(availableTags.map((t) => [t.id, t])),
    [availableTags]
  );

  // Get selected tags
  const selectedTags = useMemo(
    () =>
      selectedIds
        .map((id) => tagMap.get(id))
        .filter((t): t is ITag => t !== undefined),
    [selectedIds, tagMap]
  );

  // Handle tag toggle
  const handleToggle = useCallback(
    (tagId: string) => {
      setSelectedIds((prev) => {
        if (prev.includes(tagId)) {
          return prev.filter((id) => id !== tagId);
        }
        return [...prev, tagId];
      });
      markDirty();
    },
    [markDirty]
  );

  // Handle remove tag from selection
  const handleRemoveTag = useCallback(
    (tagId: string) => {
      setSelectedIds((prev) => prev.filter((id) => id !== tagId));
      markDirty();
    },
    [markDirty]
  );

  // Handle create new tag
  const handleCreateTag = useCallback(async () => {
    if (!searchTerm.trim() || !onCreateTag) return;

    setIsCreating(true);
    try {
      const newTag = await onCreateTag(searchTerm.trim());
      setSelectedIds((prev) => [...prev, newTag.id]);
      setSearchTerm("");
      markDirty();
      message.success(`Tag "${newTag.title}" created`);
    } catch {
      message.error("Failed to create tag");
    } finally {
      setIsCreating(false);
    }
  }, [searchTerm, onCreateTag, markDirty]);

  // Check if search term matches any existing tag
  const canCreateTag = useMemo(() => {
    if (!searchTerm.trim()) return false;
    const term = searchTerm.toLowerCase();
    return !availableTags.some(
      (tag) =>
        tag.title.toLowerCase() === term || tag.slug.toLowerCase() === term
    );
  }, [searchTerm, availableTags]);

  // Handle save
  const handleSave = useCallback(() => {
    onSave?.({ tagIds: selectedIds });
    pop();
  }, [selectedIds, onSave, pop]);

  return (
    <ModalLayout
      name="edit-tags"
      header={
        <ModalHeader
          name="edit-tags"
          title="Edit Tags"
          onClose={pop}
          submitButtonProps={{
            children: "Save Changes",
            onClick: handleSave,
          }}
        />
      }
    >
      <div className={styles.container}>
        {/* Selection Summary */}
        <Paper className={styles.selectionSummary}>
          <Typography.Text className={styles.summaryLabel}>
            Selected Tags ({selectedTags.length})
          </Typography.Text>
          {selectedTags.length > 0 ? (
            <div className={styles.selectedList}>
              {selectedTags.map((tag) => (
                <Tag
                  key={tag.id}
                  color={tag.color}
                  closable
                  onClose={() => handleRemoveTag(tag.id)}
                  className={styles.selectedTag}
                >
                  {tag.title}
                </Tag>
              ))}
            </div>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              No tags selected
            </Typography.Text>
          )}
        </Paper>

        {/* Tag Selection */}
        <Paper>
          <Typography.Text className={styles.sectionTitle}>
            Available Tags
          </Typography.Text>
          <Typography.Text className={styles.sectionHint}>
            Click on tags to select or deselect them.
          </Typography.Text>

          <div className={styles.searchWrapper}>
            <Input
              placeholder="Search tags..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </div>

          <div className={styles.tagsList}>
            {/* Create new tag option */}
            {canCreateTag && onCreateTag && (
              <>
                <div
                  className={styles.createTagWrapper}
                  onClick={handleCreateTag}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                >
                  <PlusOutlined className={styles.createTagIcon} />
                  <Typography.Text className={styles.createTagText}>
                    Create "{searchTerm.trim()}"
                  </Typography.Text>
                  {isCreating && (
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      Creating...
                    </Typography.Text>
                  )}
                </div>
                <Divider style={{ margin: "8px 0" }} />
              </>
            )}

            {filteredTags.length > 0 ? (
              filteredTags.map((tag) => {
                const isSelected = selectedIds.includes(tag.id);
                return (
                  <div
                    key={tag.id}
                    className={cx(
                      styles.tagRow,
                      isSelected && styles.tagRowSelected
                    )}
                    onClick={() => handleToggle(tag.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleToggle(tag.id)}
                  >
                    <div className={styles.tagInfo}>
                      {tag.color ? (
                        <div
                          className={styles.tagColorDot}
                          style={{ background: tag.color }}
                        />
                      ) : (
                        <TagOutlined className={styles.tagIcon} />
                      )}
                      <Typography.Text className={styles.tagLabel}>
                        {tag.title}
                      </Typography.Text>
                      <Typography.Text className={styles.tagSlug}>
                        #{tag.slug}
                      </Typography.Text>
                    </div>
                    <Checkbox
                      checked={isSelected}
                      className={styles.tagCheckbox}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleToggle(tag.id)}
                    />
                  </div>
                );
              })
            ) : (
              <Empty
                description={
                  searchTerm
                    ? "No tags match your search"
                    : "No tags available"
                }
                className={styles.emptyState}
              />
            )}
          </div>
        </Paper>
      </div>
    </ModalLayout>
  );
};
