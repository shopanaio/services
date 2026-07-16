"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Flex, Tag, Typography, type MenuProps } from "antd";
import { LuArrowDown as ArrowDownOutlined, LuArrowUp as ArrowUpOutlined } from "react-icons/lu";
import type { ApiFile, ApiGenericUserError } from "@/graphql/types";
import { ReviewContentStatus } from "@/graphql/types";
import { EntityMediaGallery } from "@/domains/media/components/entity-media-gallery";
import { useReviewConfiguration } from "@/domains/customer-content/management/hooks";
import { humanizeEnum, reviewStatusConfig } from "../../components/review-details-card/review-details-card.utils";
import type { ReviewMediaDraftItem } from "../../modals";
import { useReviewMediaItemModal } from "../../modals";
import { useReviewFormStyles } from "../shared/review-form.styles";
import { ReviewModalFrame, useReviewSectionModal } from "../shared/review-section-modal";

function draftFromReview(review: NonNullable<ReturnType<typeof useReviewSectionModal>["review"]>): ReviewMediaDraftItem[] {
  return review.media.map((item) => ({
    file: item.file,
    caption: item.caption ?? null,
    status: item.status,
    moderationNote: item.moderationNote ?? null,
    moderatedByPrincipalId: item.moderatedByPrincipalId ?? null,
    moderatedAt: item.moderatedAt ?? null,
    moderationDirty: false,
  }));
}

export function EditReviewMediaModal() {
  const { styles } = useReviewFormStyles();
  const state = useReviewSectionModal("Customer media updated");
  const configuration = useReviewConfiguration();
  const { push: openItem } = useReviewMediaItemModal();
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const initialItemOpened = useRef(false);
  const [items, setItems] = useState<ReviewMediaDraftItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const { setError } = useForm<{ media: string }>({ defaultValues: { media: "" } });
  const maxFiles = configuration.data?.reviewsQuery.storeConfiguration?.maxReviewMediaCount;

  useEffect(() => {
    if (!state.review) return;
    if (initialized.current && lastReload.current === state.reloadVersion) return;
    setItems(draftFromReview(state.review));
    setDirty(false);
    setItemErrors({});
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [state.reloadVersion, state.review]);
  useEffect(() => state.setDirty(dirty), [dirty, state.setDirty]);

  const reconcileFiles = (files: ApiFile[]) => {
    const current = new Map(items.map((item) => [item.file.id, item]));
    setItems(files.map((file) => current.get(file.id) ?? {
      file,
      caption: null,
      status: ReviewContentStatus.Pending,
      moderationNote: null,
      moderatedByPrincipalId: null,
      moderatedAt: null,
      moderationDirty: false,
    }));
    setDirty(true);
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    setItems((current) => {
      if (toIndex < 0 || toIndex >= current.length || fromIndex === toIndex) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return current;
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDirty(true);
  };

  const editItem = (file: ApiFile) => {
    const item = items.find((candidate) => candidate.file.id === file.id);
    if (!item) return;
    openItem({
      item,
      onApply: (next: ReviewMediaDraftItem) => {
        setItems((current) => current.map((candidate) => candidate.file.id === next.file.id ? next : candidate));
        setItemErrors((current) => {
          const nextErrors = { ...current };
          delete nextErrors[next.file.id];
          return nextErrors;
        });
        setDirty(true);
      },
    });
  };

  useEffect(() => {
    if (initialItemOpened.current || !state.payload.initialMediaFileId || !items.length) return;
    const item = items.find((candidate) => candidate.file.id === state.payload.initialMediaFileId);
    if (!item) return;
    initialItemOpened.current = true;
    openItem({
      item,
      onApply: (next: ReviewMediaDraftItem) => {
        setItems((current) => current.map((candidate) => candidate.file.id === next.file.id ? next : candidate));
        setDirty(true);
      },
    });
  }, [items, openItem, state.payload.initialMediaFileId]);

  const collectItemErrors = (errors: ApiGenericUserError[]) => {
    const next: Record<string, string> = {};
    for (const error of errors) {
      const path = error.field ?? [];
      const mediaIndex = path.findIndex((part) => part === "media");
      const index = Number(path[mediaIndex + 1]);
      const item = Number.isInteger(index) ? items[index] : undefined;
      if (item) next[item.file.id] = error.message;
    }
    setItemErrors(next);
  };

  const save = async () => {
    await state.save<{ media: string }>(
      {
        media: items.map((item, sortIndex) => ({
          fileId: item.file.id,
          sortIndex,
          caption: item.caption,
          moderation: item.moderationDirty
            ? { status: item.status, moderationNote: item.moderationNote }
            : undefined,
        })),
      },
      {},
      setError,
      collectItemErrors,
    );
  };

  return (
    <ReviewModalFrame
      name="review-edit-media"
      title="Edit customer media"
      loading={state.mutationLoading}
      disabled={!dirty || !state.review || maxFiles === undefined || items.length > maxFiles || state.conflict}
      onSubmit={() => void save()}
      onClose={state.pop}
      queryLoading={state.queryLoading}
      hasReview={Boolean(state.review)}
      error={state.error ?? configuration.error?.message ?? null}
      conflict={state.conflict}
      onReload={() => void state.reloadLatest()}
    >
      {state.review ? (
        <EntityMediaGallery
          value={items.map((item) => item.file)}
          onChange={reconcileFiles}
          viewMode="list"
          showUpload
          showUploadButtonInHeader
          showViewSwitcher={false}
          allowDelete
          allowSetFeatured={false}
          hasFeatured={false}
          accept="image/*,video/*"
          maxFiles={maxFiles}
          title="Customer media"
          headerExtra={<Typography.Text type="secondary">{items.length} / {maxFiles ?? "…"}</Typography.Text>}
          emptyMessage="No customer media"
          renderListMeta={(file) => {
            const item = items.find((candidate) => candidate.file.id === file.id);
            if (!item) return null;
            const config = reviewStatusConfig[item.status];
            return (
              <Flex vertical gap={2}>
                <Tag color={config.color} icon={config.icon} className={styles.mediaItemMeta}>
                  {humanizeEnum(item.status)}
                </Tag>
                {itemErrors[file.id] ? <Typography.Text type="danger">{itemErrors[file.id]}</Typography.Text> : null}
              </Flex>
            );
          }}
          getItemMenuItems={(_file, index): NonNullable<MenuProps["items"]> => [
            {
              key: "move-up",
              label: "Move up",
              icon: <ArrowUpOutlined />,
              disabled: index === 0,
              onClick: () => moveItem(index, index - 1),
            },
            {
              key: "move-down",
              label: "Move down",
              icon: <ArrowDownOutlined />,
              disabled: index === items.length - 1,
              onClick: () => moveItem(index, index + 1),
            },
          ]}
          onEditItem={(file) => editItem(file)}
          editItemLabel="Edit details"
        />
      ) : null}
    </ReviewModalFrame>
  );
}
