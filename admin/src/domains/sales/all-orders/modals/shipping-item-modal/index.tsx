"use client";
import { useMemo, useState } from "react";
import { Alert, Avatar, Divider, Flex, Input, Select, Table, Typography } from "antd";
import { createStyles } from "antd-style";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import type { OrderShippingItemModalPayload } from "../../modals";
import { useCreateShippingItem, useOrder, useUpdateShippingItem } from "../../hooks";
import { WeightPopover } from "../../components/items/item-edit-popover";
import type { ApiOrderItem } from "../../graphql/operation-types";
const useStyles = createStyles(({ token }) => ({
  container: {
    width: 1000,
    maxWidth: "calc(100vw - 48px)",
    padding: token.paddingSM,
    boxSizing: "border-box",
  },
  tracking: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: token.padding,
    marginTop: token.margin,
    "@media (max-width: 680px)": { gridTemplateColumns: "1fr" },
  },
  label: { display: "block", marginBottom: token.marginXS, fontWeight: 500 },
}));
export function OrderShippingItemModal() {
  const { styles } = useStyles();
  const { payload, pop, forcePop } = useModalStackContext();
  const value = payload as OrderShippingItemModalPayload;
  const query = useOrder(value.orderId);
  const [methodId, setMethodId] = useState(value.shippingMethodId ?? "standard");
  const [trackingCode, setTrackingCode] = useState(value.trackingCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateShippingItem();
  const update = useUpdateShippingItem();
  const fulfillment = query.order?.fulfillments.find((item) => item.id === value.fulfillmentId);
  const dirty = useMemo(
    () =>
      methodId !== (value.shippingMethodId ?? "standard") ||
      trackingCode !== (value.trackingCode ?? ""),
    [methodId, trackingCode, value.shippingMethodId, value.trackingCode],
  );
  const refresh = async () => {
    await query.refetch();
    await value.onSaved?.();
  };
  const submit = async () => {
    const version = query.order?.version ?? value.expectedVersion;
    const result =
      value.mode === "create"
        ? await create.createShippingItem({
            id: value.orderId,
            fulfillmentId: value.fulfillmentId,

            shippingMethodId: methodId,
            trackingCode: trackingCode.trim() || null,
          })
        : await update.updateShippingItem({
            id: value.orderId,
            fulfillmentId: value.fulfillmentId,
            shippingItemId: value.shippingItemId!,

            shippingMethodId: methodId,
            trackingCode: trackingCode.trim() || null,
          });
    if (!result.order) return setError(result.userErrors.map((item) => item.message).join(" "));
    await value.onSaved?.();
    forcePop();
  };
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
      title: "Quantity",
      key: "quantity",
      width: 130,
      render: (_: unknown, item: ApiOrderItem) => (
        <Typography.Text>
          {item.fulfillmentQuantity ?? item.quantity} of {item.quantity}
        </Typography.Text>
      ),
    },
    {
      title: "Unit weight",
      key: "weight",
      width: 170,
      render: (_: unknown, item: ApiOrderItem) =>
        query.order ? (
          <WeightPopover
            orderId={query.order.id}
            expectedVersion={query.order.version}
            item={item}
            refetch={refresh}
          >
            {item.weight ? (
              <Typography.Text>
                {item.weight.value}
                {item.weight.unit}
              </Typography.Text>
            ) : (
              <Typography.Text type="secondary">Not set</Typography.Text>
            )}
          </WeightPopover>
        ) : null,
    },
  ];
  const loading = query.loading || create.loading || update.loading;
  return (
    <ModalLayout
      name="order-shipping-item"
      header={
        <ModalHeader
          title="Shipping details"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            loading,
            disabled: value.mode === "edit" && !dirty,
            onClick: submit,
          }}
        />
      }
    >
      <div className={styles.container}>
        {error || query.error || create.error || update.error ? (
          <Alert
            type="error"
            showIcon
            message={
              error ?? query.error?.message ?? create.error?.message ?? update.error?.message
            }
          />
        ) : null}
        <Table<ApiOrderItem>
          rowKey="id"
          pagination={false}
          columns={columns}
          dataSource={fulfillment?.orderItems ?? []}
          locale={{ emptyText: "No items set" }}
        />
        <Divider style={{ margin: "0 0 24px" }} />
        <Typography.Text strong style={{ fontSize: 16 }}>
          Tracking info
        </Typography.Text>
        <div className={styles.tracking}>
          <div>
            <Typography.Text className={styles.label}>Shipping method</Typography.Text>
            <Select
              value={methodId}
              onChange={setMethodId}
              options={[
                { value: "standard", label: "Standard" },
                { value: "express", label: "Express" },
              ]}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <Typography.Text className={styles.label}>Tracking code</Typography.Text>
            <Input
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value)}
              maxLength={100}
              placeholder="Tracking number"
            />
          </div>
        </div>
      </div>
    </ModalLayout>
  );
}
