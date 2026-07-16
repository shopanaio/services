"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flex, Input, Switch, Typography } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  reviewIncentiveSectionSchema,
  type ReviewIncentiveSectionValues,
} from "../review-modal/schema";
import { ReviewFormField, ReviewModalFrame, useReviewSectionModal } from "../shared/review-section-modal";

export function EditReviewIncentiveModal() {
  const state = useReviewSectionModal("Incentive disclosure updated");
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const form = useForm<ReviewIncentiveSectionValues>({
    resolver: zodResolver(reviewIncentiveSectionSchema),
    defaultValues: { isIncentivized: false, disclosure: "" },
    mode: "onChange",
  });
  const { control, handleSubmit, reset, setError, watch, formState: { errors, isDirty, isValid } } = form;
  const isIncentivized = watch("isIncentivized");

  useEffect(() => {
    if (!state.review) return;
    if (initialized.current && lastReload.current === state.reloadVersion) return;
    reset({ isIncentivized: state.review.isIncentivized, disclosure: state.review.incentiveDisclosure ?? "" });
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.reloadVersion, state.review]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);

  const submit = handleSubmit(async (values) => {
    await state.save<ReviewIncentiveSectionValues>(
      { incentive: { isIncentivized: values.isIncentivized, disclosure: values.isIncentivized ? values.disclosure.trim() : null } },
      { "incentive.isIncentivized": "isIncentivized", "incentive.disclosure": "disclosure" },
      setError,
    );
  });

  return (
    <ReviewModalFrame
      name="review-edit-incentive"
      title="Edit incentive disclosure"
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
        <Paper>
          <PaperHeader title="Disclosure" />
          <Flex vertical gap="middle">
            <Controller name="isIncentivized" control={control} render={({ field }) => (
              <Switch autoFocus checked={field.value} onChange={field.onChange} checkedChildren="Incentivized" unCheckedChildren="Not incentivized" />
            )} />
            {isIncentivized ? (
              <ReviewFormField label="Public disclosure *" error={errors.disclosure?.message} help="This is a disclosure marker; Shopana does not issue a reward.">
                <Controller name="disclosure" control={control} render={({ field }) => (
                  <Input.TextArea {...field} rows={4} maxLength={500} showCount status={errors.disclosure ? "error" : undefined} />
                )} />
              </ReviewFormField>
            ) : (
              <Typography.Text type="secondary">No disclosure will be shown and any existing disclosure will be cleared.</Typography.Text>
            )}
          </Flex>
        </Paper>
      ) : null}
    </ReviewModalFrame>
  );
}
