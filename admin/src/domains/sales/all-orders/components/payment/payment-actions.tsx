"use client";
import { Button, Flex } from "antd";
import type { ApiOrder } from "../../graphql/operation-types";
import { OrderPaymentStatus } from "../../graphql/operation-types";
import { useOrderPaymentStatusModal } from "../../modals";
export function PaymentActions({
  order,
  refetch,
}: {
  order: ApiOrder;
  refetch: () => Promise<unknown>;
}) {
  const modal = useOrderPaymentStatusModal();
  const payment = order.paymentItem;
  if (!payment || payment.status !== OrderPaymentStatus.Pending) return null;
  const open = (nextStatus: OrderPaymentStatus) =>
    modal.push({
      orderId: order.id,
      paymentItemId: payment.id,

      currentStatus: payment.status,
      nextStatus,
      onSaved: refetch,
    });
  return (
    <Flex gap="middle" style={{ marginTop: 16 }}>
      <Button onClick={() => open(OrderPaymentStatus.Paid)}>Mark as paid</Button>
      <Button danger onClick={() => open(OrderPaymentStatus.Cancelled)}>
        Cancel payment
      </Button>
    </Flex>
  );
}
