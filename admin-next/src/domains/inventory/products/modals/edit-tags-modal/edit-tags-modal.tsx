"use client";

import { useState, useCallback, useMemo } from "react";
import { createStyles } from "antd-style";
import {
  Typography,
  Flex,
  Input,
  Empty,
  Tag,
  Checkbox,
  Button,
  Divider,
  message,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  TagOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper } from "../../components/paper";
import type { IEditTagsModalPayload, ITag } from "../../modals";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 16,
  },
  searchWrapper: {
    marginBottom: 8,
  },
  tagsList: {
    maxHeight: 320,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  tagRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background 0.2s",
    "&:hover": {
      background: token.colorBgLayout,
    },
  },
  tagRowSelected: {
    background: token.colorPrimaryBg,
    "&:hover": {
      background: token.colorPrimaryBgHover,
    },
  },
  tagInfo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  tagIcon: {
    color: token.colorTextSecondary,
    fontSize: 14,
    flexShrink: 0,
  },
  tagLabel: {
    fontSize: 13,
  },
  tagSlug: {
    fontSize: 11,
    color: token.colorTextSecondary,
    marginLeft: 4,
  },
  tagCheckbox: {
    marginRight: 0,
  },
  selectionSummary: {
    padding: 12,
    background: token.colorBgLayout,
    borderRadius: 8,
  },
  summaryLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: token.colorTextSecondary,
    marginBottom: 8,
    display: "block",
  },
  selectedList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
  },
  selectedTag: {
    margin: 0,
    cursor: "pointer",
  },
  emptyState: {
    padding: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 8,
    display: "block",
  },
  sectionHint: {
    fontSize: 11,
    color: token.colorTextSecondary,
    marginBottom: 12,
    display: "block",
  },
  createTagWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 6,
    background: token.colorBgLayout,
    cursor: "pointer",
    transition: "background 0.2s",
    "&:hover": {
      background: token.colorBgTextHover,
    },
  },
  createTagIcon: {
    color: token.colorPrimary,
    fontSize: 14,
  },
  createTagText: {
    fontSize: 13,
    color: token.colorPrimary,
  },
  tagColorDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
}));

// ============================================================================
// Mock Tags Data
// ============================================================================

const mockTags: ITag[] = [
  { id: "tag-1", title: "New Arrival", slug: "new-arrival", color: "#52c41a" },
  { id: "tag-2", title: "Best Seller", slug: "best-seller", color: "#faad14" },
  { id: "tag-3", title: "Sale", slug: "sale", color: "#ff4d4f" },
  { id: "tag-4", title: "Limited Edition", slug: "limited-edition", color: "#722ed1" },
  { id: "tag-5", title: "Trending", slug: "trending", color: "#1677ff" },
  { id: "tag-6", title: "Eco-Friendly", slug: "eco-friendly", color: "#13c2c2" },
  { id: "tag-7", title: "Handmade", slug: "handmade", color: "#eb2f96" },
  { id: "tag-8", title: "Premium", slug: "premium", color: "#fadb14" },
  { id: "tag-9", title: "Clearance", slug: "clearance", color: "#fa541c" },
  { id: "tag-10", title: "Gift Idea", slug: "gift-idea", color: "#a0d911" },
  { id: "tag-11", title: "Seasonal", slug: "seasonal", color: "#2f54eb" },
  { id: "tag-12", title: "Exclusive", slug: "exclusive", color: "#531dab" },
  { id: "tag-13", title: "Featured", slug: "featured", color: "#08979c" },
  { id: "tag-14", title: "Organic", slug: "organic", color: "#389e0d" },
  { id: "tag-15", title: "Imported", slug: "imported", color: "#d48806" },
];

// ============================================================================
// Main Component
// ============================================================================

export interface IEditTagsModalProps {
  productId?: string;
  selectedTagIds?: string[];
  availableTags?: ITag[];
  onSave?: (data: { tagIds: string[] }) => void;
  onCreateTag?: (title: string) => Promise<ITag>;
}

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
