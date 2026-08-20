"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flex, Input, Select } from "antd";
import { shopLocales } from "@/defs/localization";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  reviewContentSectionSchema,
  type ReviewContentSectionValues,
} from "../review-modal/schema";
import {
  ReviewFormField,
  ReviewModalFrame,
  useReviewSectionModal,
} from "../shared/review-section-modal";

export function EditReviewContentModal() {
  const state = useReviewSectionModal("Review content updated");
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const form = useForm<ReviewContentSectionValues>({
    resolver: zodResolver(reviewContentSectionSchema),
    defaultValues: { locale: "en", title: "", body: "" },
    mode: "onChange",
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isValid },
  } = form;

  useEffect(() => {
    if (!state.review) return;
    if (initialized.current && lastReload.current === state.reloadVersion) return;
    reset({
      locale: state.review.locale,
      title: state.review.title ?? "",
      body: state.review.body,
    });
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.reloadVersion, state.review]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);

  const submit = handleSubmit(async (values) => {
    await state.save<ReviewContentSectionValues>(
      {
        content: {
          text: {
            locale: values.locale,
            title: values.title.trim() || null,
            body: values.body.trim(),
          },
        },
      },
      {
        "content.text.locale": "locale",
        "content.text.title": "title",
        "content.text.body": "body",
      },
      setError,
    );
  });

  return (
    <ReviewModalFrame
      name="review-edit-content"
      title="Edit review content"
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
          <PaperHeader title="Content" />
          <Flex vertical gap="middle">
            <ReviewFormField label="Locale *" error={errors.locale?.message}>
              <Controller
                name="locale"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    autoFocus
                    showSearch
                    status={errors.locale ? "error" : undefined}
                    options={shopLocales.map((locale) => ({
                      value: locale.value,
                      label: `${locale.name} (${locale.value})`,
                    }))}
                    optionFilterProp="label"
                    style={{ width: "100%" }}
                  />
                )}
              />
            </ReviewFormField>
            <ReviewFormField label="Title" error={errors.title?.message}>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    maxLength={150}
                    showCount
                    status={errors.title ? "error" : undefined}
                  />
                )}
              />
            </ReviewFormField>
            <ReviewFormField
              label="Review *"
              error={errors.body?.message}
              help="At least 20 characters. Plain text; line breaks are preserved."
            >
              <Controller
                name="body"
                control={control}
                render={({ field }) => (
                  <Input.TextArea
                    {...field}
                    autoSize={{ minRows: 8, maxRows: 16 }}
                    maxLength={5000}
                    showCount
                    status={errors.body ? "error" : undefined}
                  />
                )}
              />
            </ReviewFormField>
          </Flex>
        </Paper>
      ) : null}
    </ReviewModalFrame>
  );
}
