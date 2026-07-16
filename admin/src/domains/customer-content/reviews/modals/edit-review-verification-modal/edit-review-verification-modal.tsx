"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flex, Input, Segmented, Typography } from "antd";
import { ReviewVerificationStatus } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { humanizeEnum } from "../../components/review-details-card/review-details-card.utils";
import {
  reviewVerificationSectionSchema,
  type ReviewVerificationSectionValues,
} from "../review-modal/schema";
import { useReviewFormStyles } from "../shared/review-form.styles";
import { ReviewFormField, ReviewModalFrame, useReviewSectionModal } from "../shared/review-section-modal";

function toLocalDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function EditReviewVerificationModal() {
  const { styles } = useReviewFormStyles();
  const state = useReviewSectionModal("Purchase verification updated");
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const form = useForm<ReviewVerificationSectionValues>({
    resolver: zodResolver(reviewVerificationSectionSchema),
    defaultValues: { status: ReviewVerificationStatus.Unverified, method: "", verifiedAt: "" },
    mode: "onChange",
  });
  const { control, handleSubmit, reset, setError, watch, formState: { errors, isDirty, isValid } } = form;
  const status = watch("status");

  useEffect(() => {
    if (!state.review) return;
    if (initialized.current && lastReload.current === state.reloadVersion) return;
    reset({
      status: state.review.verificationStatus,
      method: state.review.verificationMethod ?? "",
      verifiedAt: toLocalDateTime(state.review.verifiedAt),
    });
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.reloadVersion, state.review]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);

  const submit = handleSubmit(async (values) => {
    const clearsEvidence = values.status === ReviewVerificationStatus.Unverified;
    await state.save<ReviewVerificationSectionValues>(
      {
        verification: {
          status: values.status,
          method: clearsEvidence ? null : values.method.trim(),
          verifiedAt: clearsEvidence ? null : new Date(values.verifiedAt).toISOString(),
        },
      },
      { "verification.status": "status", "verification.method": "method", "verification.verifiedAt": "verifiedAt" },
      setError,
    );
  });

  return (
    <ReviewModalFrame
      name="review-edit-verification"
      title="Edit purchase verification"
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
          <PaperHeader title="Purchase verification" />
          <Flex vertical gap="middle">
            <ReviewFormField label="Status *" error={errors.status?.message}>
              <Controller name="status" control={control} render={({ field }) => (
                <Segmented autoFocus block {...field} options={Object.values(ReviewVerificationStatus).map((value) => ({ value, label: humanizeEnum(value) }))} />
              )} />
            </ReviewFormField>
            {status !== ReviewVerificationStatus.Unverified ? (
              <div className={styles.fieldGrid}>
                <ReviewFormField label="Method *" error={errors.method?.message}>
                  <Controller name="method" control={control} render={({ field }) => <Input {...field} maxLength={64} status={errors.method ? "error" : undefined} />} />
                </ReviewFormField>
                <ReviewFormField label="Verified at *" error={errors.verifiedAt?.message}>
                  <Controller name="verifiedAt" control={control} render={({ field }) => <Input {...field} type="datetime-local" status={errors.verifiedAt ? "error" : undefined} />} />
                </ReviewFormField>
              </div>
            ) : null}
            <Typography.Text type="secondary">
              {status === ReviewVerificationStatus.Unverified
                ? "Saving as Unverified clears the verification method and timestamp."
                : status === ReviewVerificationStatus.Revoked
                  ? "Revoked keeps the verification evidence and marks it as no longer valid."
                  : "Verified stores the method and timestamp as purchase evidence."}
            </Typography.Text>
          </Flex>
        </Paper>
      ) : null}
    </ReviewModalFrame>
  );
}
