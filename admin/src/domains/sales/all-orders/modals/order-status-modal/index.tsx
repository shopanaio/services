"use client";
import { useState } from "react";
import { Alert, App, Input, Typography } from "antd";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import type { OrderStatusModalPayload } from "../../modals";
import { useUpdateOrderStatus } from "../../hooks";
import { OrderStatus } from "../../graphql/operation-types";
export function OrderStatusModal() {
  const { payload, pop, forcePop } = useModalStackContext();
  const value = payload as OrderStatusModalPayload;
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const mutation = useUpdateOrderStatus();
  const destructive =
    value.nextStatus === OrderStatus.Cancelled || value.nextStatus === OrderStatus.Archived;
  const invalid = destructive && !comment.trim();
  const submit = async () => {
    const result = await mutation.updateOrderStatus({
      id: value.entityId,
      expectedVersion: value.expectedVersion,
      nextStatus: value.nextStatus,
      comment: comment.trim() || null,
    });
    if (!result.order) return setErrors(result.userErrors.map((error) => error.message));
    await value.onSaved?.();
    App.useApp;
    forcePop();
  };
  return (
    <ModalLayout
      name="order-status"
      header={
        <ModalHeader
          title="Change order status"
          onClose={pop}
          submitButtonProps={{
            children: "Confirm",
            danger: destructive,
            loading: mutation.loading,
            disabled: invalid,
            onClick: submit,
          }}
        />
      }
    >
      {mutation.error ? <Alert type="error" message={mutation.error.message} showIcon /> : null}
      {errors.length ? <Alert type="error" message={errors.join(" ")} showIcon /> : null}
      <Typography.Paragraph>
        Change order status to <strong>{value.nextStatus}</strong>.
      </Typography.Paragraph>
      <Input.TextArea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={500}
        rows={4}
        placeholder={destructive ? "Reason required" : "Optional comment"}
      />
    </ModalLayout>
  );
}
