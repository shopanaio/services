"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flex, Input, Segmented, Typography } from "antd";
import {
  LuCircleCheck as CheckCircleOutlined,
  LuClock as ClockCircleOutlined,
  LuCircleX as CloseCircleOutlined,
} from "react-icons/lu";
import { ReviewContentStatus } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { formatReviewDateTime, humanizeEnum } from "../../components/review-details-card/review-details-card.utils";
import {
  reviewModerationSectionSchema,
  type ReviewModerationSectionValues,
} from "../review-modal/schema";
import { useReviewFormStyles } from "../shared/review-form.styles";
import { ReviewFormField, ReviewModalFrame, useReviewSectionModal } from "../shared/review-section-modal";

const consequence: Record<ReviewContentStatus, string> = {
  [ReviewContentStatus.Pending]: "Awaiting a moderation decision and excluded from published review surfaces.",
  [ReviewContentStatus.Published]: "Visible on product pages and included in rating aggregates.",
  [ReviewContentStatus.Rejected]: "Rejected and excluded from published review surfaces.",
};

export function EditReviewModerationModal() {
  const stylesState = useReviewFormStyles();
  const { styles, cx } = stylesState;
  const state = useReviewSectionModal("Review moderation updated");
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const form = useForm<ReviewModerationSectionValues>({
    resolver: zodResolver(reviewModerationSectionSchema),
    defaultValues: { status: ReviewContentStatus.Pending, moderationNote: "" },
    mode: "onChange",
  });
  const { control, handleSubmit, reset, setError, watch, formState: { errors, isDirty, isValid } } = form;
  const status = watch("status");

  useEffect(() => {
    if (!state.review) return;
    if (initialized.current && lastReload.current === state.reloadVersion) return;
    reset({ status: state.review.status, moderationNote: state.review.moderationNote ?? "" });
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.reloadVersion, state.review]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);

  const submit = handleSubmit(async (values) => {
    await state.save<ReviewModerationSectionValues>(
      { content: { moderation: { status: values.status, moderationNote: values.moderationNote.trim() || null } } },
      { "content.moderation.status": "status", "content.moderation.moderationNote": "moderationNote" },
      setError,
    );
  });
  const contextClass = status === ReviewContentStatus.Pending
    ? styles.contextPending
    : status === ReviewContentStatus.Published
      ? styles.contextPublished
      : styles.contextRejected;

  return (
    <ReviewModalFrame
      name="review-edit-moderation"
      title="Review moderation"
      loading={state.mutationLoading}
      disabled={!isDirty || !isValid || !state.review || state.conflict}
      onSubmit={() => void submit()}
      onClose={state.pop}
      queryLoading={state.queryLoading}
      hasReview={Boolean(state.review)}
      error={state.error}
      conflict={state.conflict}
      onReload={() => void state.reloadLatest()}
    >
      {state.review ? (
        <>
          <Paper>
            <PaperHeader title="Moderation decision" />
            <Flex vertical gap="middle">
              <Controller name="status" control={control} render={({ field }) => (
                <Segmented
                  {...field}
                  autoFocus
                  block
                  options={[
                    { value: ReviewContentStatus.Pending, label: "Pending", icon: <ClockCircleOutlined /> },
                    { value: ReviewContentStatus.Published, label: "Published", icon: <CheckCircleOutlined /> },
                    { value: ReviewContentStatus.Rejected, label: "Rejected", icon: <CloseCircleOutlined /> },
                  ]}
                />
              )} />
              <div className={cx(styles.contextPanel, contextClass)}>
                <Typography.Text strong>{humanizeEnum(status)}</Typography.Text><br />
                <Typography.Text>{consequence[status]}</Typography.Text>
              </div>
              <ReviewFormField label="Internal moderation note" error={errors.moderationNote?.message} help="This note is never shown to customers.">
                <Controller name="moderationNote" control={control} render={({ field }) => (
                  <Input.TextArea {...field} rows={5} maxLength={1000} showCount status={errors.moderationNote ? "error" : undefined} />
                )} />
              </ReviewFormField>
            </Flex>
          </Paper>
          <Typography.Text className={styles.currentValue}>
            Current decision: {humanizeEnum(state.review.status)}
            {state.review.moderatedAt ? ` · ${formatReviewDateTime(state.review.moderatedAt)}` : ""}
            {state.review.moderatedByPrincipalId ? ` · ${state.review.moderatedByPrincipalId}` : ""}
          </Typography.Text>
        </>
      ) : null}
    </ReviewModalFrame>
  );
}
