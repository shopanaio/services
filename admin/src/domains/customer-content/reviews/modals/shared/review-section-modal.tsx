"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { Alert, App, Button, Skeleton, Typography } from "antd";
import type { ApiReviewUpdateInput } from "@/graphql/types";
import type { ApiGenericUserError } from "@/graphql/types";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { useReview, useUpdateReview } from "../../hooks";
import type { ReviewSectionModalPayload } from "../../modals";
import { useReviewFormStyles } from "./review-form.styles";

export function ReviewFormField({
  label,
  error,
  help,
  children,
}: {
  label: string;
  error?: string;
  help?: string;
  children: ReactNode;
}) {
  const { styles } = useReviewFormStyles();
  return (
    <div className={styles.field}>
      <Typography.Text className={styles.label}>{label}</Typography.Text>
      {children}
      {error ? <Typography.Text className={styles.error}>{error}</Typography.Text> : null}
      {!error && help ? <Typography.Text className={styles.help}>{help}</Typography.Text> : null}
    </div>
  );
}

interface ReviewModalFrameProps {
  name: string;
  title: string;
  children: ReactNode;
  loading: boolean;
  disabled: boolean;
  onSubmit: () => void;
  onClose: () => void;
  queryLoading: boolean;
  hasReview: boolean;
  error: string | null;
  conflict: boolean;
  onReload: () => void;
}

export function ReviewModalFrame({
  name,
  title,
  children,
  loading,
  disabled,
  onSubmit,
  onClose,
  queryLoading,
  hasReview,
  error,
  conflict,
  onReload,
}: ReviewModalFrameProps) {
  return (
    <ModalLayout
      name={name}
      header={(
        <ModalHeader
          name={name}
          title={title}
          onClose={onClose}
          submitButtonProps={{ loading, disabled, onClick: onSubmit }}
        />
      )}
    >
      {conflict ? (
        <Alert
          type="warning"
          showIcon
          message="This review changed after the editor was opened."
          action={<Button onClick={onReload}>Reload latest data</Button>}
        />
      ) : null}
      {error ? <Alert type="error" showIcon message={error} /> : null}
      {queryLoading && !hasReview ? <Skeleton active paragraph={{ rows: 6 }} /> : children}
      {!queryLoading && !hasReview ? (
        <Alert type="error" showIcon message="Review not found" description="It may have been deleted or is no longer available." />
      ) : null}
    </ModalLayout>
  );
}

export function useReviewSectionModal(successMessage: string) {
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const value = payload as ReviewSectionModalPayload;
  const query = useReview(value.entityId);
  const mutation = useUpdateReview();
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);

  const save = useCallback(async <T extends FieldValues,>(
    operations: ApiReviewUpdateInput,
    fieldMap: Record<string, Path<T>>,
    setFieldError: UseFormSetError<T>,
    onUserErrors?: (errors: ApiGenericUserError[]) => void,
  ) => {
    if (!query.review) return false;
    setError(null);
    setConflict(false);
    const result = await mutation.updateReview(query.review.id, query.review.revision, operations);
    if (!result.review || result.userErrors.length) {
      onUserErrors?.(result.userErrors);
      const isConflict = result.userErrors.some((item) => item.code === "REVISION_CONFLICT");
      setConflict(isConflict);
      const unmapped: string[] = [];
      for (const item of result.userErrors) {
        if (item.code === "REVISION_CONFLICT") continue;
        const path = item.field?.join(".") ?? "";
        const match = Object.entries(fieldMap).find(([apiPath]) => path === apiPath || path.endsWith(`.${apiPath}`));
        if (match) setFieldError(match[1], { message: item.message });
        else unmapped.push(item.message);
      }
      if (unmapped.length) setError(unmapped.join(" "));
      return false;
    }
    await value.onSaved?.();
    setDirty(false);
    message.success(successMessage);
    forcePop();
    return true;
  }, [forcePop, message, mutation, query.review, setDirty, successMessage, value]);

  const reloadLatest = useCallback(async () => {
    setError(null);
    await query.refetch();
    setConflict(false);
    setReloadVersion((current) => current + 1);
  }, [query]);

  return {
    payload: value,
    review: query.review,
    queryLoading: query.loading,
    queryError: query.error,
    mutationLoading: mutation.loading,
    mutationError: mutation.error,
    error: error ?? query.error?.message ?? mutation.error?.message ?? null,
    conflict,
    reloadVersion,
    reloadLatest,
    save,
    pop,
    setDirty,
  };
}
