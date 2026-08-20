"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Descriptions, Flex, Input, Select, Timeline, Typography } from "antd";
import { LuShoppingBag as ShoppingOutlined, LuUser as UserOutlined } from "react-icons/lu";
import { ReviewNotificationChannel, ReviewRequestTransitionAction } from "@/graphql/types";
import { shopLocales } from "@/defs/localization";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useEntityPicker, useVariantPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import "@/shared/components/entity-picker-modal/configs/product-picker-config";
import "@/domains/customers/all-customers/picker/customer-picker-config";
import { useManagementMutations } from "../hooks";
import type { ReviewRequestModalPayload } from "../modals";

const toLocal = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const defaultScheduledAt = toLocal(new Date(new Date().getTime() + 86_400_000));

export function ReviewRequestModal() {
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const value = payload as ReviewRequestModalPayload;
  const current = value.reviewRequest;
  const mutations = useManagementMutations();
  const [customer, setCustomer] = useState<IPickableEntity | null>(
    current ? { id: current.customer.id, title: current.customer.displayName } : null,
  );
  const [product, setProduct] = useState<IPickableEntity | null>(
    current ? { id: current.product.id, title: current.product.title } : null,
  );
  const [variant, setVariant] = useState<IPickableEntity | null>(
    current?.variant
      ? { id: current.variant.id, title: current.variant.title ?? "Untitled variant" }
      : null,
  );
  const [orderId, setOrderId] = useState(current?.orderId ?? "");
  const [orderLineId, setOrderLineId] = useState(current?.orderLineId ?? "");
  const [channel, setChannel] = useState(current?.channel ?? ReviewNotificationChannel.Email);
  const [locale, setLocale] = useState(current?.locale ?? "en");
  const [scheduledAt, setScheduledAt] = useState(
    current?.scheduledAt.slice(0, 16) ?? defaultScheduledAt,
  );
  const [expiresAt, setExpiresAt] = useState(current?.expiresAt?.slice(0, 16) ?? "");
  const [transition, setTransition] = useState<ReviewRequestTransitionAction | undefined>();
  const [reason, setReason] = useState("");
  const [dirty, setLocalDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setDirty(dirty), [dirty, setDirty]);
  const change = () => setLocalDirty(true);
  const customerPicker = useEntityPicker<IPickableEntity>({
    entityType: "customer",
    selectionMode: "single",
    initialSelection: customer ? [customer.id] : [],
    onConfirm: (items) => {
      setCustomer(items[0] ?? null);
      change();
    },
  });
  const productPicker = useEntityPicker<IPickableEntity>({
    entityType: "product",
    selectionMode: "single",
    initialSelection: product ? [product.id] : [],
    onConfirm: (items) => {
      setProduct(items[0] ?? null);
      setVariant(null);
      change();
    },
  });
  const variantPicker = useVariantPicker({
    selectionMode: "single",
    initialSelection: variant ? [variant.id] : [],
    queryMeta: product ? { productId: product.id } : undefined,
    onConfirm: (items) => {
      setVariant(items[0] ?? null);
      change();
    },
  });
  const save = async () => {
    setError(null);
    if (!customer || !product || !orderId.trim() || !orderLineId.trim() || !scheduledAt)
      return setError("Customer, product, order, order line and schedule are required.");
    const result = current
      ? await mutations.updateRequest(current.id, current.updatedAt, {
          delivery: { channel, locale },
          schedule: {
            scheduledAt: new Date(scheduledAt).toISOString(),
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          },
          transition: transition
            ? { action: transition, reason: reason.trim() || null }
            : undefined,
        })
      : await mutations.createRequest({
          customerId: customer.id,
          productId: product.id,
          variantId: variant?.id ?? null,
          orderId: orderId.trim(),
          orderLineId: orderLineId.trim(),
          channel,
          locale,
          sourceChannel: "ADMIN",
          idempotencyKey: crypto.randomUUID(),
          scheduledAt: new Date(scheduledAt).toISOString(),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        });
    if (result.errors.length) return setError(result.errors.map((item) => item.message).join(" "));
    await value.onSaved?.();
    setDirty(false);
    message.success(current ? "Review request updated" : "Review request created");
    forcePop();
  };
  return (
    <ModalLayout
      name="review-request"
      header={
        <ModalHeader
          name="review-request"
          title={current ? "Review request" : "New review request"}
          onClose={pop}
          extra={
            current ? (
              <Typography.Text type="secondary">{current.status.toLowerCase()}</Typography.Text>
            ) : null
          }
          submitButtonProps={{
            children: current ? "Save" : "Create",
            loading: mutations.loading,
            disabled: (!!current && !dirty) || !customer || !product || !orderId || !orderLineId,
            onClick: save,
          }}
        />
      }
    >
      {error ? <Alert type="error" showIcon message={error} /> : null}
      <Paper>
        <PaperHeader title="Recipient & subject" />
        <Flex vertical gap="middle">
          <div>
            <Typography.Text strong>Customer *</Typography.Text>
            <Flex gap="small" style={{ marginTop: 8 }}>
              <Input readOnly value={customer?.title ?? ""} />
              <Button
                disabled={!!current}
                icon={<UserOutlined />}
                onClick={customerPicker.openPicker}
              >
                Select
              </Button>
            </Flex>
          </div>
          <div>
            <Typography.Text strong>Product *</Typography.Text>
            <Flex gap="small" style={{ marginTop: 8 }}>
              <Input readOnly value={product?.title ?? ""} />
              <Button
                disabled={!!current}
                icon={<ShoppingOutlined />}
                onClick={productPicker.openPicker}
              >
                Select
              </Button>
            </Flex>
          </div>
          <div>
            <Typography.Text strong>Variant</Typography.Text>
            <Flex gap="small" style={{ marginTop: 8 }}>
              <Input readOnly value={variant?.title ?? ""} />
              <Button disabled={!!current || !product} onClick={variantPicker.openPicker}>
                Select
              </Button>
            </Flex>
          </div>
          <Flex gap="middle">
            <div style={{ flex: 1 }}>
              <Typography.Text strong>Order ID *</Typography.Text>
              <Input
                disabled={!!current}
                value={orderId}
                onChange={(event) => {
                  setOrderId(event.target.value);
                  change();
                }}
                style={{ marginTop: 8 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Typography.Text strong>Order line ID *</Typography.Text>
              <Input
                disabled={!!current}
                value={orderLineId}
                onChange={(event) => {
                  setOrderLineId(event.target.value);
                  change();
                }}
                style={{ marginTop: 8 }}
              />
            </div>
          </Flex>
        </Flex>
      </Paper>
      <Paper>
        <PaperHeader title="Delivery" />
        <Flex vertical gap="middle">
          <Select
            value={channel}
            options={Object.values(ReviewNotificationChannel).map((item) => ({
              value: item,
              label: item.toLowerCase().replaceAll("_", " "),
            }))}
            onChange={(next) => {
              setChannel(next);
              change();
            }}
          />
          <Select
            value={locale}
            options={shopLocales.map((item) => ({ value: item.value, label: item.name }))}
            onChange={(next) => {
              setLocale(next);
              change();
            }}
            showSearch
          />
          <Flex gap="middle">
            <div style={{ flex: 1 }}>
              <Typography.Text>Scheduled at *</Typography.Text>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => {
                  setScheduledAt(event.target.value);
                  change();
                }}
                style={{ marginTop: 8 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Typography.Text>Expires at</Typography.Text>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => {
                  setExpiresAt(event.target.value);
                  change();
                }}
                style={{ marginTop: 8 }}
              />
            </div>
          </Flex>
        </Flex>
      </Paper>
      {current ? (
        <>
          <Paper>
            <PaperHeader title="Delivery state" />
            <Descriptions
              column={2}
              items={[
                { key: "attempts", label: "Attempts", children: current.attemptCount },
                {
                  key: "provider",
                  label: "Provider message",
                  children: current.providerMessageId ?? "—",
                },
                {
                  key: "sent",
                  label: "Sent",
                  children: current.sentAt ? new Date(current.sentAt).toLocaleString() : "—",
                },
                {
                  key: "delivered",
                  label: "Delivered",
                  children: current.deliveredAt
                    ? new Date(current.deliveredAt).toLocaleString()
                    : "—",
                },
                {
                  key: "opened",
                  label: "Opened",
                  children: current.openedAt ? new Date(current.openedAt).toLocaleString() : "—",
                },
                { key: "error", label: "Last error", children: current.lastError ?? "—" },
              ]}
            />
          </Paper>
          <Paper>
            <PaperHeader title="Transition" />
            <Flex vertical gap="middle">
              <Select
                allowClear
                value={transition}
                placeholder="No transition"
                options={Object.values(ReviewRequestTransitionAction).map((item) => ({
                  value: item,
                  label: item.toLowerCase(),
                }))}
                onChange={(next) => {
                  setTransition(next);
                  change();
                }}
              />
              <Input.TextArea
                value={reason}
                placeholder="Reason"
                onChange={(event) => {
                  setReason(event.target.value);
                  change();
                }}
                rows={3}
              />
            </Flex>
          </Paper>
          <Paper>
            <PaperHeader title={`Events (${current.events.totalCount})`} />
            <Timeline
              items={current.events.edges.map(({ node }) => ({
                children: (
                  <>
                    <Typography.Text strong>{node.type.toLowerCase()}</Typography.Text>
                    <br />
                    <Typography.Text type="secondary">
                      {new Date(node.occurredAt).toLocaleString()}
                    </Typography.Text>
                  </>
                ),
              }))}
            />
          </Paper>
        </>
      ) : null}
    </ModalLayout>
  );
}
