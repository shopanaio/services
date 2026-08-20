"use client";

import { useEffect, useRef } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import type { Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flex, Rate, Typography } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  reviewRatingsSectionSchema,
  type ReviewRatingsSectionValues,
} from "../review-modal/schema";
import {
  ReviewFormField,
  ReviewModalFrame,
  useReviewSectionModal,
} from "../shared/review-section-modal";

export function EditReviewRatingsModal() {
  const state = useReviewSectionModal("Review ratings updated");
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const form = useForm<ReviewRatingsSectionValues>({
    resolver: zodResolver(reviewRatingsSectionSchema),
    defaultValues: { overall: 5, criteria: [] },
    mode: "onChange",
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isDirty, isValid },
  } = form;
  const { fields } = useFieldArray({ control, name: "criteria" });
  const overall = watch("overall");

  useEffect(() => {
    if (!state.review) return;
    if (initialized.current && lastReload.current === state.reloadVersion) return;
    reset({
      overall: state.review.rating,
      criteria: state.review.ratings.map((item) => ({
        criterionId: item.criterion.id,
        title: item.criterion.defaultTitle,
        value: item.value,
      })),
    });
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.reloadVersion, state.review]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);

  const submit = handleSubmit(async (values) => {
    const fieldMap: Record<string, Path<ReviewRatingsSectionValues>> = {
      "rating.overall": "overall",
    };
    values.criteria.forEach((_, index) => {
      fieldMap[`rating.criteria.${index}.value`] = `criteria.${index}.value`;
      fieldMap[`rating.criteria.${index}.criterionId`] = `criteria.${index}.criterionId`;
    });
    await state.save<ReviewRatingsSectionValues>(
      {
        rating: {
          overall: values.overall,
          criteria: values.criteria.map((item) => ({
            criterionId: item.criterionId,
            value: item.value,
          })),
        },
      },
      fieldMap,
      setError,
    );
  });

  return (
    <ReviewModalFrame
      name="review-edit-ratings"
      title="Edit ratings"
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
            <PaperHeader title="Overall rating" />
            <ReviewFormField label="Overall *" error={errors.overall?.message}>
              <Flex gap={12} align="center" wrap="wrap">
                <Controller
                  name="overall"
                  control={control}
                  render={({ field }) => (
                    <Rate autoFocus value={field.value} onChange={field.onChange} />
                  )}
                />
                <Typography.Text>{overall} / 5</Typography.Text>
              </Flex>
            </ReviewFormField>
          </Paper>
          {fields.length ? (
            <Paper>
              <PaperHeader title="Rating criteria" />
              <Flex vertical gap="middle">
                {fields.map((field, index) => (
                  <ReviewFormField
                    key={field.id}
                    label={field.title}
                    error={errors.criteria?.[index]?.value?.message}
                  >
                    <Flex gap={12} align="center" wrap="wrap">
                      <Controller
                        name={`criteria.${index}.value`}
                        control={control}
                        render={({ field: ratingField }) => (
                          <Rate value={ratingField.value} onChange={ratingField.onChange} />
                        )}
                      />
                      <Typography.Text>{watch(`criteria.${index}.value`)} / 5</Typography.Text>
                    </Flex>
                  </ReviewFormField>
                ))}
                <Typography.Text type="secondary">
                  Values are saved as one complete criterion rating set.
                </Typography.Text>
              </Flex>
            </Paper>
          ) : null}
        </>
      ) : null}
    </ReviewModalFrame>
  );
}
