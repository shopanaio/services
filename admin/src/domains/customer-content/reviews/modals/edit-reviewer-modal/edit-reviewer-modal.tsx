"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Button, Flex, Input, Select, Typography } from "antd";
import { LuUser as UserOutlined } from "react-icons/lu";
import { ReviewContentAuthorType } from "@/graphql/types";
import { useEntityPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import "@/domains/customers/all-customers/picker/customer-picker-config";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { humanizeEnum } from "../../components/review-details-card/review-details-card.utils";
import {
  reviewReviewerSectionSchema,
  type ReviewReviewerSectionValues,
} from "../review-modal/schema";
import { useReviewFormStyles } from "../shared/review-form.styles";
import { ReviewFormField, ReviewModalFrame, useReviewSectionModal } from "../shared/review-section-modal";

interface CustomerPickerEntity extends IPickableEntity {
  email?: string;
}

export function EditReviewerModal() {
  const { modal } = App.useApp();
  const { styles } = useReviewFormStyles();
  const state = useReviewSectionModal("Reviewer updated");
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const [customer, setCustomer] = useState<CustomerPickerEntity | null>(null);
  const form = useForm<ReviewReviewerSectionValues>({
    resolver: zodResolver(reviewReviewerSectionSchema),
    defaultValues: { authorType: ReviewContentAuthorType.Customer, customerId: "", displayName: "", email: "" },
    mode: "onChange",
  });
  const { control, handleSubmit, reset, setError, setValue, watch, formState: { errors, isDirty, isValid } } = form;
  const authorType = watch("authorType");
  const customerId = watch("customerId");

  useEffect(() => {
    if (!state.review) return;
    if (initialized.current && lastReload.current === state.reloadVersion) return;
    const linked = state.review.author.customer;
    setCustomer(linked ? { id: linked.id, title: linked.displayName, email: linked.email ?? "" } : null);
    reset({
      authorType: state.review.author.type,
      customerId: linked?.id ?? "",
      displayName: state.review.author.displayName,
      email: state.review.author.email ?? "",
    });
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.reloadVersion, state.review]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);

  const customerPicker = useEntityPicker<CustomerPickerEntity>({
    entityType: "customer",
    selectionMode: "single",
    initialSelection: customerId ? [customerId] : [],
    onConfirm: (items) => {
      const selected = items[0] ?? null;
      setCustomer(selected);
      setValue("customerId", selected?.id ?? "", { shouldDirty: true, shouldValidate: true });
      if (selected) {
        setValue("displayName", selected.title, { shouldDirty: true, shouldValidate: true });
        setValue("email", selected.email ?? "", { shouldDirty: true, shouldValidate: true });
      }
    },
  });

  const changeAuthorType = async (next: ReviewContentAuthorType) => {
    if (authorType === ReviewContentAuthorType.Customer && next !== authorType && customerId) {
      const confirmed = await modal.confirm({
        title: "Remove linked customer?",
        content: "The reviewer snapshot will remain editable, but the customer link will be cleared.",
        okText: "Remove link",
      });
      if (!confirmed) return;
      setCustomer(null);
      setValue("customerId", "", { shouldDirty: true, shouldValidate: true });
    }
    setValue("authorType", next, { shouldDirty: true, shouldValidate: true });
  };

  const submit = handleSubmit(async (values) => {
    await state.save<ReviewReviewerSectionValues>(
      {
        content: {
          author: {
            type: values.authorType,
            customerId: values.authorType === ReviewContentAuthorType.Customer ? values.customerId : null,
            displayName: values.displayName.trim(),
            email: values.email.trim() || null,
          },
        },
      },
      {
        "content.author.type": "authorType",
        "content.author.customerId": "customerId",
        "content.author.displayName": "displayName",
        "content.author.email": "email",
      },
      setError,
    );
  });

  return (
    <ReviewModalFrame
      name="review-edit-reviewer"
      title="Edit reviewer"
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
          <PaperHeader title="Reviewer identity" />
          <Flex vertical gap="middle">
            <ReviewFormField label="Author type *" error={errors.authorType?.message}>
              <Select
                autoFocus
                value={authorType}
                onChange={(next) => void changeAuthorType(next)}
                options={Object.values(ReviewContentAuthorType).map((value) => ({ value, label: humanizeEnum(value) }))}
                style={{ width: "100%" }}
              />
            </ReviewFormField>
            {authorType === ReviewContentAuthorType.Customer ? (
              <ReviewFormField label="Linked customer *" error={errors.customerId?.message}>
                <Flex gap="small">
                  <Input readOnly value={customer?.title ?? ""} status={errors.customerId ? "error" : undefined} />
                  <Button icon={<UserOutlined />} onClick={customerPicker.openPicker}>Select</Button>
                </Flex>
              </ReviewFormField>
            ) : null}
            <div className={styles.fieldGrid}>
              <ReviewFormField label="Display name *" error={errors.displayName?.message}>
                <Controller name="displayName" control={control} render={({ field }) => <Input {...field} status={errors.displayName ? "error" : undefined} />} />
              </ReviewFormField>
              <ReviewFormField label="Email" error={errors.email?.message}>
                <Controller name="email" control={control} render={({ field }) => <Input {...field} type="email" status={errors.email ? "error" : undefined} />} />
              </ReviewFormField>
            </div>
            <Typography.Text type="secondary">Name and email are stored as the review author snapshot.</Typography.Text>
          </Flex>
        </Paper>
      ) : null}
    </ReviewModalFrame>
  );
}
