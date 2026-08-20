"use client";
import { useEffect, useMemo, useState } from "react";
import { App, Avatar, Button, Dropdown, Flex, Input, Space, Table, Tag, Typography } from "antd";
import {
  LuMinus as MinusOutlined,
  LuEllipsis as MoreOutlined,
  LuPlus as PlusOutlined,
} from "react-icons/lu";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { OrderPrice } from "../money/price";
import { CostPricePopover } from "../items/item-edit-popover";
import { fulfillmentStatusConfig } from "../status/status-config";
import { useSplitFulfillment, useUndoFulfillmentSplit } from "../../hooks";
import {
  OrderFulfillmentStatus,
  type ApiOrder,
  type ApiOrderFulfillment,
  type ApiOrderItem,
} from "../../graphql/operation-types";
import { useOrderFulfillmentStatusModal, useOrderShippingItemModal } from "../../modals";

const nextMenu: Record<OrderFulfillmentStatus, OrderFulfillmentStatus[]> = {
  [OrderFulfillmentStatus.Pending]: [
    OrderFulfillmentStatus.Fulfilled,
    OrderFulfillmentStatus.OnHold,
    OrderFulfillmentStatus.Cancelled,
  ],
  [OrderFulfillmentStatus.Processing]: [
    OrderFulfillmentStatus.Shipped,
    OrderFulfillmentStatus.Delivered,
    OrderFulfillmentStatus.Fulfilled,
    OrderFulfillmentStatus.Cancelled,
  ],
  [OrderFulfillmentStatus.OnHold]: [OrderFulfillmentStatus.Processing],
  [OrderFulfillmentStatus.Shipped]: [
    OrderFulfillmentStatus.Delivered,
    OrderFulfillmentStatus.Fulfilled,
    OrderFulfillmentStatus.Cancelled,
  ],
  [OrderFulfillmentStatus.Delivered]: [OrderFulfillmentStatus.Fulfilled],
  [OrderFulfillmentStatus.Returned]: [OrderFulfillmentStatus.Fulfilled],
  [OrderFulfillmentStatus.Cancelled]: [],
  [OrderFulfillmentStatus.Fulfilled]: [],
};

export function ActiveFulfillment({
  order,
  fulfillment,
  parent,
  refetch,
}: {
  order: ApiOrder;
  fulfillment: ApiOrderFulfillment;
  parent: ApiOrderFulfillment | null;
  refetch: () => Promise<unknown>;
}) {
  const { message } = App.useApp();
  const statusModal = useOrderFulfillmentStatusModal();
  const shippingModal = useOrderShippingItemModal();
  const splitMutation = useSplitFulfillment();
  const undoMutation = useUndoFulfillmentSplit();
  const [splitting, setSplitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!splitting) {
      setSelectedIds([]);
      setQuantities({});
    }
  }, [splitting]);
  const status = fulfillmentStatusConfig[fulfillment.status];
  const canSplit =
    !fulfillment.parentId &&
    (fulfillment.orderItems.length > 1 ||
      (fulfillment.orderItems[0]?.fulfillmentQuantity ?? 0) > 1);
  const changeStatus = (nextStatus: OrderFulfillmentStatus) =>
    statusModal.push({
      orderId: order.id,
      fulfillmentId: fulfillment.id,
      expectedVersion: order.version,
      currentStatus: fulfillment.status,
      nextStatus,
      onSaved: refetch,
    });
  const openShipping = () =>
    shippingModal.push({
      mode: fulfillment.shippingItem ? "edit" : "create",
      orderId: order.id,
      fulfillmentId: fulfillment.id,
      shippingItemId: fulfillment.shippingItem?.id,
      expectedVersion: order.version,
      shippingMethodId: fulfillment.shippingItem?.shippingMethod.id,
      trackingCode: fulfillment.shippingItem?.trackingCode,
      onSaved: refetch,
    });
  const finishSplit = async () => {
    const result = await splitMutation.splitFulfillment({
      id: order.id,
      expectedVersion: order.version,
      fulfillmentId: fulfillment.id,
      items: selectedIds.map((orderItemId) => ({
        orderItemId,
        quantity: quantities[orderItemId] ?? 1,
      })),
    });
    if (!result.order)
      return void message.error(result.userErrors[0]?.message ?? "Failed to split fulfillment");
    setSplitting(false);
    await refetch();
    message.success("Fulfillment split");
  };
  const undoSplit = async () => {
    const result = await undoMutation.undoFulfillmentSplit({
      id: order.id,
      expectedVersion: order.version,
      fulfillmentId: fulfillment.id,
    });
    if (!result.order)
      return void message.error(result.userErrors[0]?.message ?? "Failed to undo splitting");
    await refetch();
    message.success("Fulfillment restored");
  };
  const menuItems = useMemo(
    () => [
      ...(fulfillment.shippingItem
        ? [{ key: "tracking", label: "Edit tracking info", onClick: openShipping }]
        : fulfillment.status !== OrderFulfillmentStatus.Pending
          ? [{ key: "tracking", label: "Add tracking info", onClick: openShipping }]
          : []),
      ...nextMenu[fulfillment.status].map((next) => ({
        key: next,
        label:
          next === OrderFulfillmentStatus.Fulfilled
            ? "Mark as fulfilled"
            : next === OrderFulfillmentStatus.Shipped
              ? "Mark as shipped"
              : next === OrderFulfillmentStatus.Delivered
                ? "Mark as delivered"
                : next === OrderFulfillmentStatus.Processing
                  ? "Resume fulfillment"
                  : next === OrderFulfillmentStatus.OnHold
                    ? "Hold fulfillment"
                    : "Cancel fulfillment",
        danger: next === OrderFulfillmentStatus.Cancelled,
        onClick: () => changeStatus(next),
      })),
    ],
    [fulfillment],
  );
  const columns = [
    {
      title: "",
      key: "cover",
      width: 58,
      render: (_: unknown, item: ApiOrderItem) => (
        <Avatar shape="square">{item.product.title[0]}</Avatar>
      ),
    },
    {
      title: "Product",
      key: "product",
      render: (_: unknown, item: ApiOrderItem) => (
        <Flex vertical>
          <Typography.Text>{item.product.title}</Typography.Text>
          <Typography.Text type="secondary">{item.product.sku ?? "No SKU"}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: splitting ? "Split quantity" : "Quantity",
      key: "quantity",
      width: 170,
      render: (_: unknown, item: ApiOrderItem) => {
        const available = item.fulfillmentQuantity ?? item.quantity;
        const value = quantities[item.id] ?? available;
        const selected = selectedIds.includes(item.id);
        return splitting && selected ? (
          <Space.Compact>
            <Button
              disabled={available <= 1 || value <= 1}
              icon={<MinusOutlined />}
              onClick={() =>
                setQuantities((current) => ({ ...current, [item.id]: Math.max(1, value - 1) }))
              }
            />
            <Input
              readOnly
              value={`${value} of ${available}`}
              style={{ width: 76, textAlign: "center" }}
            />
            <Button
              disabled={available <= 1 || value >= available}
              icon={<PlusOutlined />}
              onClick={() =>
                setQuantities((current) => ({
                  ...current,
                  [item.id]: Math.min(available, value + 1),
                }))
              }
            />
          </Space.Compact>
        ) : (
          <Typography.Text strong>
            {available} <Typography.Text type="secondary">of {item.quantity}</Typography.Text>
          </Typography.Text>
        );
      },
    },
    {
      title: "Cost price",
      key: "cost",
      width: 125,
      render: (_: unknown, item: ApiOrderItem) => (
        <CostPricePopover
          orderId={order.id}
          expectedVersion={order.version}
          item={item}
          refetch={refetch}
        >
          {item.productCostPrice != null ? (
            <OrderPrice amount={item.productCostPrice} />
          ) : (
            <Typography.Text type="secondary">Not set</Typography.Text>
          )}
        </CostPricePopover>
      ),
    },
    {
      title: "Unit price",
      key: "price",
      width: 115,
      render: (_: unknown, item: ApiOrderItem) => <OrderPrice amount={item.price} />,
    },
    {
      title: "Total",
      key: "total",
      width: 115,
      render: (_: unknown, item: ApiOrderItem) => (
        <Typography.Text strong>
          <OrderPrice amount={(item.fulfillmentQuantity ?? item.quantity) * item.price} />
        </Typography.Text>
      ),
    },
  ];
  return (
    <Paper>
      <PaperHeader
        title={
          <Flex gap="small" align="center">
            <Typography.Text strong style={{ fontSize: 16 }}>
              Products
            </Typography.Text>
            <Tag color={status.color}>{status.label}</Tag>
          </Flex>
        }
        actions={
          !splitting &&
          fulfillment.status !== OrderFulfillmentStatus.Pending &&
          menuItems.length ? (
            <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items: menuItems }}>
              <Button type="text" icon={<MoreOutlined />} />
            </Dropdown>
          ) : null
        }
      />
      {splitting ? (
        <Typography.Text type="secondary">
          Select items, then adjust the quantity moved to the new fulfillment.
        </Typography.Text>
      ) : null}
      <Table<ApiOrderItem>
        tableLayout="fixed"
        rowKey="id"
        pagination={false}
        rowSelection={
          splitting
            ? {
                selectedRowKeys: selectedIds,
                columnWidth: 50,
                onChange: (keys) => {
                  const ids = keys.map(String);
                  setSelectedIds(ids);
                  setQuantities((current) =>
                    Object.fromEntries(
                      ids.map((id) => [
                        id,
                        current[id] ??
                          fulfillment.orderItems.find((item) => item.id === id)
                            ?.fulfillmentQuantity ??
                          fulfillment.orderItems.find((item) => item.id === id)?.quantity ??
                          1,
                      ]),
                    ),
                  );
                },
              }
            : undefined
        }
        columns={columns}
        dataSource={fulfillment.orderItems}
      />
      {splitting ? (
        <Flex gap="middle" style={{ marginTop: 16 }}>
          <Button onClick={() => setSplitting(false)}>Cancel</Button>
          <Button
            disabled={
              !selectedIds.length ||
              (selectedIds.length === fulfillment.orderItems.length &&
                selectedIds.every(
                  (id) =>
                    quantities[id] ===
                    (fulfillment.orderItems.find((item) => item.id === id)?.fulfillmentQuantity ??
                      fulfillment.orderItems.find((item) => item.id === id)?.quantity),
                ))
            }
            loading={splitMutation.loading}
            onClick={finishSplit}
          >
            Split fulfillment
          </Button>
        </Flex>
      ) : null}
      {!splitting && fulfillment.status === OrderFulfillmentStatus.Pending ? (
        <Flex style={{ marginTop: 16 }}>
          <Space.Compact>
            <Button onClick={openShipping}>Ship products</Button>
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{
                items: [
                  ...nextMenu[fulfillment.status].map((next) => ({
                    key: next,
                    label:
                      next === OrderFulfillmentStatus.Fulfilled
                        ? "Mark as fulfilled"
                        : next === OrderFulfillmentStatus.OnHold
                          ? "Hold fulfillment"
                          : "Cancel",
                    danger: next === OrderFulfillmentStatus.Cancelled,
                    onClick: () => changeStatus(next),
                  })),
                  ...(canSplit
                    ? [
                        {
                          key: "split",
                          label: "Split fulfillment",
                          onClick: () => setSplitting(true),
                        },
                      ]
                    : []),
                  ...(parent?.status === OrderFulfillmentStatus.Pending
                    ? [{ key: "undo", label: "Undo splitting", onClick: () => void undoSplit() }]
                    : []),
                ],
              }}
            >
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space.Compact>
        </Flex>
      ) : null}
      {fulfillment.shippingItem ? (
        <>
          <div style={{ borderTop: "1px solid rgba(5,5,5,.06)", margin: "16px 0" }} />
          <Flex gap="large">
            <Flex gap="small">
              <Typography.Text type="secondary">Shipping method</Typography.Text>
              <Typography.Text>{fulfillment.shippingItem.shippingMethod.name}</Typography.Text>
            </Flex>
            <Flex gap="small">
              <Typography.Text type="secondary">Tracking code</Typography.Text>
              <Typography.Text
                strong={Boolean(fulfillment.shippingItem.trackingCode)}
                copyable={Boolean(fulfillment.shippingItem.trackingCode)}
              >
                {fulfillment.shippingItem.trackingCode ?? "No tracking code"}
              </Typography.Text>
            </Flex>
          </Flex>
        </>
      ) : null}
    </Paper>
  );
}
