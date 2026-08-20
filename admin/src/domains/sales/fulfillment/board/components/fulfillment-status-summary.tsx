import { Flex, Tag } from "antd";
import type { FulfillmentPaymentStatus, FulfillmentStatus } from "../graphql/operation-types";

export function FulfillmentStatusSummary({
  payment,
  fulfillments,
}: {
  payment?: FulfillmentPaymentStatus;
  fulfillments: FulfillmentStatus[];
}) {
  const fulfillment = fulfillments[0] ?? "PENDING";
  const paymentColor = payment === "PAID" ? "green" : payment === "CANCELLED" ? "red" : "gold";
  const fulfillmentColor = ["DELIVERED", "FULFILLED"].includes(fulfillment)
    ? "green"
    : fulfillment === "CANCELLED"
      ? "red"
      : fulfillment === "SHIPPED"
        ? "blue"
        : "purple";
  return (
    <Flex
      gap={4}
      align="center"
      aria-label={`Payment ${payment ?? "not set"}; fulfillment ${fulfillment}`}
    >
      <Tag color={paymentColor} bordered={false}>
        {payment ?? "NO PAYMENT"}
      </Tag>
      <Tag color={fulfillmentColor} bordered={false}>
        {fulfillment.replaceAll("_", " ")}
      </Tag>
    </Flex>
  );
}
