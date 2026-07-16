"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flex, Input, Segmented, Typography } from "antd";
import {
  LuCircleCheck as CheckCircleOutlined,
  LuInfo as InfoCircleOutlined,
  LuClock as ClockCircleOutlined,
  LuCircleX as CloseCircleOutlined,
} from "react-icons/lu";
import { ReviewContentStatus } from "@/graphql/types";
import { useCurrentUser } from "@/domains/auth";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ReviewMediaDraftItem, ReviewMediaItemModalPayload } from "../../modals";
import { formatReviewDateTime, humanizeEnum } from "../../components/review-details-card/review-details-card.utils";
import { reviewMediaItemSchema, type ReviewMediaItemValues } from "../review-modal/schema";
import { useReviewFormStyles } from "../shared/review-form.styles";
import { ReviewFormField } from "../shared/review-section-modal";

const consequence: Record<ReviewContentStatus, string> = {
  [ReviewContentStatus.Pending]: "Awaiting moderation and excluded from published review media.",
  [ReviewContentStatus.Published]: "Included in published review media.",
  [ReviewContentStatus.Rejected]: "Excluded from published review media.",
};

function formatFileSize(bytes: number | string) {
  const value = Number(bytes) || 0;
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

export function EditReviewMediaItemModal() {
  const { styles, cx } = useReviewFormStyles();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const value = payload as ReviewMediaItemModalPayload;
  const currentUser = useCurrentUser();
  const form = useForm<ReviewMediaItemValues>({
    resolver: zodResolver(reviewMediaItemSchema),
    defaultValues: {
      caption: value.item.caption ?? "",
      status: value.item.status,
      moderationNote: value.item.moderationNote ?? "",
    },
    mode: "onChange",
  });
  const { control, handleSubmit, watch, formState: { errors, isDirty, isValid } } = form;
  const status = watch("status");
  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);
  const contextClass = status === ReviewContentStatus.Pending
    ? styles.contextPending
    : status === ReviewContentStatus.Published
      ? styles.contextPublished
      : styles.contextRejected;

  const apply = handleSubmit((values) => {
    const moderationChanged = values.status !== value.item.status
      || values.moderationNote.trim() !== (value.item.moderationNote ?? "");
    const now = new Date().toISOString();
    const next: ReviewMediaDraftItem = {
      ...value.item,
      caption: values.caption.trim() || null,
      status: values.status,
      moderationNote: values.moderationNote.trim() || null,
      moderationDirty: value.item.moderationDirty || moderationChanged,
      moderatedByPrincipalId: moderationChanged
        ? values.status === ReviewContentStatus.Pending ? null : currentUser.user?.id ?? null
        : value.item.moderatedByPrincipalId,
      moderatedAt: moderationChanged
        ? values.status === ReviewContentStatus.Pending ? null : now
        : value.item.moderatedAt,
    };
    value.onApply(next);
    setDirty(false);
    forcePop();
  });
  const file = value.item.file;
  const isVideo = file.mimeType?.startsWith("video/") ?? false;

  return (
    <ModalLayout
      name="review-edit-media-item"
      header={(
        <ModalHeader
          name="review-edit-media-item"
          title="Edit media details"
          onClose={pop}
          submitButtonProps={{ children: "Apply", disabled: !isDirty || !isValid, onClick: () => void apply() }}
        />
      )}
    >
      <div className={styles.mediaItemLayout}>
        <Paper>
          <PaperHeader title="Preview" />
          {isVideo ? (
            <video src={file.url} controls className={styles.mediaPreview} aria-label={file.originalName || "Review media video"} />
          ) : (
            <img src={file.url} alt={file.altText || file.originalName || "Review media"} className={styles.mediaPreview} />
          )}
          <Typography.Paragraph type="secondary" style={{ margin: "12px 0 0" }}>
            {file.originalName || file.id} · {file.ext?.toUpperCase() || file.mimeType} · {formatFileSize(file.sizeBytes)}
          </Typography.Paragraph>
        </Paper>
        <Paper>
          <PaperHeader title="Details" />
          <Flex vertical gap="middle">
            <ReviewFormField label="Caption" error={errors.caption?.message}>
              <Controller name="caption" control={control} render={({ field }) => <Input {...field} autoFocus maxLength={500} showCount status={errors.caption ? "error" : undefined} />} />
            </ReviewFormField>
            <ReviewFormField label="Moderation status" error={errors.status?.message}>
              <Controller name="status" control={control} render={({ field }) => (
                <Segmented
                  {...field}
                  block
                  options={[
                    { value: ReviewContentStatus.Pending, label: "Pending", icon: <ClockCircleOutlined /> },
                    { value: ReviewContentStatus.Published, label: "Published", icon: <CheckCircleOutlined /> },
                    { value: ReviewContentStatus.Rejected, label: "Rejected", icon: <CloseCircleOutlined /> },
                  ]}
                />
              )} />
            </ReviewFormField>
            <div className={cx(styles.contextPanel, contextClass)}>
              <Typography.Text strong>{humanizeEnum(status)}</Typography.Text><br />
              <Typography.Text>{consequence[status]}</Typography.Text>
            </div>
            <ReviewFormField
              label={`Moderation note${status === ReviewContentStatus.Rejected ? " *" : ""}`}
              error={errors.moderationNote?.message}
              help={status === ReviewContentStatus.Rejected ? "Required when media is rejected. Never shown to customers." : "Never shown to customers."}
            >
              <Controller name="moderationNote" control={control} render={({ field }) => <Input.TextArea {...field} rows={5} maxLength={1000} showCount status={errors.moderationNote ? "error" : undefined} />} />
            </ReviewFormField>
            {value.item.moderatedAt ? (
              <Typography.Text type="secondary">
                Moderated {formatReviewDateTime(value.item.moderatedAt)}{value.item.moderatedByPrincipalId ? ` by ${value.item.moderatedByPrincipalId}` : ""}
              </Typography.Text>
            ) : null}
          </Flex>
        </Paper>
      </div>
      <Flex gap={8} align="center">
        <InfoCircleOutlined />
        <Typography.Text type="secondary">Apply updates the draft. Save the media gallery to persist changes.</Typography.Text>
      </Flex>
    </ModalLayout>
  );
}
