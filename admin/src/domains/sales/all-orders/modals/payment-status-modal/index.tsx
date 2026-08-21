"use client";
import { useState } from "react";
import { Alert, Input, Typography } from "antd";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import type { OrderPaymentStatusModalPayload } from "../../modals";
import { useUpdatePaymentStatus } from "../../hooks";
export function OrderPaymentStatusModal() {
  const { payload, pop, forcePop } = useModalStackContext();
  const value = payload as OrderPaymentStatusModalPayload;
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useUpdatePaymentStatus();
  const submit = async () => {
    const result = await mutation.updatePaymentStatus({
      id: value.orderId,
      paymentItemId: value.paymentItemId,

      nextStatus: value.nextStatus,
      comment,
    });
    if (!result.order) return setError(result.userErrors.map((item) => item.message).join(" "));
    await value.onSaved?.();
    forcePop();
  };
  return (
    <ModalLayout
      name="order-payment-status"
      header={
        <ModalHeader
          title="Payment status"
          onClose={pop}
          submitButtonProps={{
            children: "Confirm",
            loading: mutation.loading,
            disabled: value.currentStatus === value.nextStatus,
            onClick: submit,
          }}
        />
      }
    >
      {error || mutation.error ? (
        <Alert type="error" showIcon message={error ?? mutation.error?.message} />
      ) : null}
      <Typography.Paragraph>
        <strong>{value.currentStatus}</strong> → <strong>{value.nextStatus}</strong>
      </Typography.Paragraph>
      <Input.TextArea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={500}
        placeholder="Optional comment"
      />
    </ModalLayout>
  );
}
