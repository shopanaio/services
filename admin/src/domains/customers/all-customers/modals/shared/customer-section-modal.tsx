"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { Alert, App, Button, Skeleton, Typography } from "antd";
import type { ApiCustomerUpdateInput, ApiGenericUserError } from "@/graphql/types";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { useCustomer, useUpdateCustomer } from "../../hooks";
import type { CustomerSectionModalPayload } from "../../modals";
import { useCustomerFormStyles } from "./customer-form.styles";

export function CustomerFormField({ label, error, help, children }: { label: string; error?: string; help?: string; children: ReactNode }) {
  const { styles } = useCustomerFormStyles();
  return (
    <div className={styles.field}>
      <Typography.Text className={styles.label}>{label}</Typography.Text>
      {children}
      {error ? <Typography.Text className={styles.error}>{error}</Typography.Text> : null}
      {!error && help ? <Typography.Text className={styles.help}>{help}</Typography.Text> : null}
    </div>
  );
}

export function CustomerSectionModalFrame({ name, title, children, loading, disabled, onSubmit, onClose, queryLoading, hasCustomer, error, conflict, onReload }: {
  name: string; title: string; children: ReactNode; loading: boolean; disabled: boolean; onSubmit: () => void; onClose: () => void; queryLoading: boolean; hasCustomer: boolean; error: string | null; conflict: boolean; onReload: () => void;
}) {
  return (
    <ModalLayout name={name} header={<ModalHeader name={name} title={title} onClose={onClose} submitButtonProps={{ children: "Save", loading, disabled, onClick: onSubmit }} />}>
      {conflict ? <Alert type="warning" showIcon message="This customer changed after the editor was opened." action={<Button onClick={onReload}>Reload latest data</Button>} /> : null}
      {error ? <Alert type="error" showIcon message={error} /> : null}
      {queryLoading && !hasCustomer ? <Skeleton active paragraph={{ rows: 7 }} /> : children}
      {!queryLoading && !hasCustomer ? <Alert type="error" showIcon message="Customer not found" description="It may have been deleted or is no longer available in this store." /> : null}
    </ModalLayout>
  );
}

export function useCustomerSectionModal(successMessage: string) {
  const { message, modal } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const value = payload as CustomerSectionModalPayload;
  const query = useCustomer(value.entityId);
  const mutation = useUpdateCustomer();
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);

  const save = useCallback(async <T extends FieldValues>(operations: ApiCustomerUpdateInput, fieldMap: Record<string, Path<T>>, setFieldError: UseFormSetError<T>, onUserErrors?: (errors: ApiGenericUserError[]) => void) => {
    if (!query.customer) return false;
    setError(null);
    setConflict(false);
    const result = await mutation.updateCustomer(query.customer.id, query.customer.revision, operations);
    if (!result.customer || result.userErrors.length) {
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
  }, [forcePop, message, mutation, query.customer, setDirty, successMessage, value]);

  const reloadLatest = useCallback(async (isDirty: boolean) => {
    if (isDirty) {
      const confirmed = await modal.confirm({
        title: "Reload latest customer data?",
        content: "Your unsaved changes will be replaced.",
        okText: "Reload",
      });
      if (!confirmed) return;
    }
    setError(null);
    await query.refetch();
    setConflict(false);
    setReloadVersion((current) => current + 1);
  }, [modal, query]);

  return {
    payload: value,
    customer: query.customer,
    queryLoading: query.loading,
    mutationLoading: mutation.loading,
    error: error ?? query.error?.message ?? mutation.error?.message ?? null,
    conflict,
    reloadVersion,
    reloadLatest,
    save,
    pop,
    setDirty,
    setGlobalError: setError,
  };
}
