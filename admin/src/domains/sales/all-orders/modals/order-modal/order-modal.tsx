"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, FormProvider, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  App,
  Avatar,
  Button,
  Descriptions,
  Dropdown,
  Flex,
  Input,
  InputNumber,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
} from "antd";
import {
  LuX as CloseOutlined,
  LuPencil as EditOutlined,
  LuEllipsis as MoreOutlined,
  LuPlus as PlusOutlined,
} from "react-icons/lu";
import { createStyles } from "antd-style";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { AdminAppExtensionPoint } from "@/domains/apps";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { OrderModalPayload } from "../../modals";
import {
  useOrderFulfillmentStatusModal,
  useOrderPaymentDetailsModal,
  useOrderShippingDetailsModal,
  useOrderShippingItemModal,
  useOrderStatusModal,
} from "../../modals";
import {
  useAddOrderComment,
  useCreateOrder,
  useOrder,
  useUpdateAdminNote,
  useUpdateOrder,
  useUpdateOrderCustomer,
  useUpdateOrderTags,
} from "../../hooks";
import {
  buildOrderCreateInput,
  buildOrderUpdateInput,
  mapOrderToFormValues,
  mapOrderUserErrors,
} from "../../mappers";
import {
  OrderFulfillmentStatus,
  OrderStatus,
  type ApiOrder,
  type ApiOrderAddress,
  type ApiOrderFulfillment,
} from "../../graphql/operation-types";
import { fulfillmentStatusConfig, orderStatusConfig } from "../../components/status/status-config";
import { OrderPrice } from "../../components/money/price";
import { DraftFulfillment } from "../../components/fulfillment/draft-fulfillment";
import { ActiveFulfillment } from "../../components/fulfillment/active-fulfillment";
import { PaymentSummary } from "../../components/payment/payment-summary";
import { orderFormSchema, type OrderFormValues } from "./schema";

const useStyles = createStyles(({ token }) => ({
  row: { display: "flex", justifyContent: "space-between", gap: token.paddingSM },
  label: { color: token.colorTextSecondary },
  fields: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: token.paddingSM },
  error: { color: token.colorError, fontSize: 12 },
  note: { whiteSpace: "pre-wrap", wordBreak: "break-word", cursor: "pointer" },
  address: { whiteSpace: "pre-line" },
  timelineMeta: { color: token.colorTextSecondary, fontSize: token.fontSizeSM },
  table: { marginTop: token.marginSM },
  summary: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: `${token.paddingXS}px ${token.padding}px`,
  },
  timelineSection: { padding: `${token.paddingXL}px 0 0` },
  timelineTitle: { marginLeft: token.margin, marginBottom: token.margin },
  commentPaper: { display: "flex", alignItems: "flex-end", gap: token.paddingSM },
}));

const defaults: OrderFormValues = {
  customerId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  currencyCode: "USD",
  externalSystemId: "",
  shippingMethodId: "standard",
  paymentMethodId: "card",
  tags: [],
  adminNote: "",
  items: [
    {
      id: "",
      productId: crypto.randomUUID(),
      title: "",
      sku: "",
      price: 0,
      quantity: 1,
      weight: null,
      costPrice: null,
    },
  ],
};

function addressText(address: ApiOrderAddress | null) {
  if (!address) return "No address";
  return [
    address.address1,
    address.address2,
    `${address.city}, ${address.postalCode}`,
    address.countryCode,
  ]
    .filter(Boolean)
    .join("\n");
}

export function OrderModal() {
  const { styles } = useStyles();
  const { message, modal } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typed = payload as OrderModalPayload;
  const isEdit = typed.mode === "edit";
  const query = useOrder(isEdit ? typed.entityId : undefined);
  const createMutation = useCreateOrder();
  const updateMutation = useUpdateOrder();
  const noteMutation = useUpdateAdminNote();
  const tagsMutation = useUpdateOrderTags();
  const customerMutation = useUpdateOrderCustomer();
  const commentMutation = useAddOrderComment();
  const orderStatusModal = useOrderStatusModal();
  const fulfillmentStatusModal = useOrderFulfillmentStatusModal();
  const shippingItemModal = useOrderShippingItemModal();
  const shippingDetailsModal = useOrderShippingDetailsModal();
  const paymentDetailsModal = useOrderPaymentDetailsModal();
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");

  const methods = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: defaults,
    mode: "onChange",
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty, isValid },
  } = methods;
  const items = useFieldArray({ control, name: "items" });

  useEffect(() => setDirty(!isEdit && isDirty), [isDirty, isEdit, setDirty]);
  useEffect(() => {
    if (!query.order) return;
    reset(mapOrderToFormValues(query.order));
    setNote(query.order.adminNote ?? "");
  }, [query.order, reset]);

  const refresh = useCallback(async () => {
    await query.refetch();
    await typed.onSaved?.();
  }, [query, typed]);

  const submitOrder = useCallback(
    async (values: OrderFormValues) => {
      setGlobalErrors([]);
      clearErrors();
      const result =
        isEdit && query.order
          ? await updateMutation.updateOrder(buildOrderUpdateInput(values, query.order))
          : await createMutation.createOrder(buildOrderCreateInput(values));
      if (!result.order || result.userErrors.length) {
        const global: string[] = [];
        mapOrderUserErrors(result.userErrors).forEach((value) =>
          value.field
            ? setError(value.field, { message: value.message })
            : global.push(value.message),
        );
        setGlobalErrors(global);
        return;
      }
      await typed.onSaved?.();
      setDirty(false);
      message.success(isEdit ? "Order updated" : "Order created");
      forcePop();
    },
    [
      clearErrors,
      createMutation,
      forcePop,
      isEdit,
      message,
      query.order,
      setDirty,
      setError,
      typed,
      updateMutation,
    ],
  );

  const saveNote = useCallback(async () => {
    const order = query.order;
    if (!order) return;
    const result = await noteMutation.updateAdminNote({
      id: order.id,

      adminNote: note.trim() || null,
    });
    if (!result.order) return setGlobalErrors(result.userErrors.map((error) => error.message));
    setEditingNote(false);
    await refresh();
    message.success("Note updated");
  }, [message, note, noteMutation, query.order, refresh]);

  const saveComment = useCallback(async () => {
    const order = query.order;
    if (!order || !comment.trim()) return;
    const result = await commentMutation.addOrderComment({
      id: order.id,

      comment: comment.trim(),
    });
    if (!result.order) return setGlobalErrors(result.userErrors.map((error) => error.message));
    setComment("");
    await refresh();
  }, [comment, commentMutation, query.order, refresh]);

  if (isEdit && query.loading) {
    return (
      <ModalLayout
        name="order-editor"
        header={<ModalHeader title="Order" onClose={pop} submitButtonProps={{ disabled: true }} />}
      >
        <Skeleton active paragraph={{ rows: 16 }} />
      </ModalLayout>
    );
  }
  if (isEdit && !query.order) {
    return (
      <ModalLayout
        name="order-editor"
        headerProps={{ title: "Order", onClose: pop, submitButtonProps: null }}
      >
        <Alert type="error" showIcon message={query.error?.message ?? "Order not found"} />
      </ModalLayout>
    );
  }

  const order = query.order;
  const saving = createMutation.loading || updateMutation.loading;
  const draftProductColumns = [
    {
      title: "Product",
      key: "product",
      render: (_: unknown, __: unknown, index: number) => (
        <Controller
          name={`items.${index}.title`}
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              disabled={isEdit && order?.status !== OrderStatus.Draft}
              placeholder="Product"
            />
          )}
        />
      ),
    },
    {
      title: "Quantity",
      key: "quantity",
      width: 100,
      render: (_: unknown, __: unknown, index: number) => (
        <Controller
          name={`items.${index}.quantity`}
          control={control}
          render={({ field }) => (
            <InputNumber
              {...field}
              min={1}
              precision={0}
              disabled={isEdit && order?.status !== OrderStatus.Draft}
              style={{ width: "100%" }}
            />
          )}
        />
      ),
    },
    {
      title: "Unit price",
      key: "price",
      width: 120,
      render: (_: unknown, __: unknown, index: number) => (
        <Controller
          name={`items.${index}.price`}
          control={control}
          render={({ field }) => (
            <InputNumber
              {...field}
              min={0}
              disabled={isEdit && order?.status !== OrderStatus.Draft}
              style={{ width: "100%" }}
            />
          )}
        />
      ),
    },
    {
      title: "Total",
      key: "total",
      width: 110,
      render: (_: unknown, __: unknown, index: number) =>
        order ? <OrderPrice amount={order.orderItems[index]?.totalAmount ?? 0} /> : "—",
    },
    {
      title: "",
      key: "actions",
      width: 45,
      render: (_: unknown, __: unknown, index: number) =>
        !order || order.status === OrderStatus.Draft ? (
          <Button
            type="text"
            danger
            icon={<CloseOutlined />}
            disabled={items.fields.length === 1}
            onClick={() => items.remove(index)}
          />
        ) : null,
    },
  ];

  const activeProductColumns = [
    {
      title: "Product",
      key: "product",
      render: (_: unknown, record: ApiOrder["orderItems"][number]) => (
        <Flex align="center" gap="small">
          <Avatar shape="square">{record.product.title[0]}</Avatar>
          <Flex vertical>
            <Typography.Text>{record.product.title}</Typography.Text>
            <Typography.Text type="secondary">{record.product.sku ?? "No SKU"}</Typography.Text>
          </Flex>
        </Flex>
      ),
    },
    {
      title: "Quantity",
      key: "quantity",
      width: 105,
      render: (_: unknown, record: ApiOrder["orderItems"][number]) => (
        <Typography.Text strong>
          {record.fulfillmentQuantity ?? record.quantity}{" "}
          <Typography.Text type="secondary">of {record.quantity}</Typography.Text>
        </Typography.Text>
      ),
    },
    {
      title: "Cost price",
      key: "cost",
      width: 115,
      render: (_: unknown, record: ApiOrder["orderItems"][number]) =>
        record.productCostPrice != null ? (
          <OrderPrice amount={record.productCostPrice} />
        ) : (
          <Typography.Text type="secondary">Not set</Typography.Text>
        ),
    },
    {
      title: "Unit price",
      key: "price",
      width: 115,
      render: (_: unknown, record: ApiOrder["orderItems"][number]) => (
        <OrderPrice amount={record.price} />
      ),
    },
    {
      title: "Total",
      key: "total",
      width: 115,
      render: (_: unknown, record: ApiOrder["orderItems"][number]) => (
        <Typography.Text strong>
          <OrderPrice amount={(record.fulfillmentQuantity ?? record.quantity) * record.price} />
        </Typography.Text>
      ),
    },
  ];

  const renderProducts = (fulfillment?: ApiOrderFulfillment) => {
    const status = fulfillment ? fulfillmentStatusConfig[fulfillment.status] : null;
    return (
      <Paper key={fulfillment?.id ?? "draft-products"}>
        <PaperHeader
          title={
            <Flex align="center" gap="small">
              <Typography.Text strong style={{ fontSize: 16 }}>
                Products
              </Typography.Text>
              {status ? <Tag color={status.color}>{status.label}</Tag> : null}
            </Flex>
          }
          actions={
            order?.status === OrderStatus.Draft ? (
              <Button
                icon={<PlusOutlined />}
                onClick={() =>
                  items.append({
                    id: "",
                    productId: crypto.randomUUID(),
                    title: "",
                    sku: "",
                    price: 0,
                    quantity: 1,
                    weight: null,
                    costPrice: null,
                  })
                }
              >
                Add products
              </Button>
            ) : fulfillment ? (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "status",
                      label: "Change status",
                      onClick: () =>
                        fulfillmentStatusModal.push({
                          orderId: order!.id,
                          fulfillmentId: fulfillment.id,

                          currentStatus: fulfillment.status,
                          nextStatus:
                            fulfillment.status === OrderFulfillmentStatus.Pending
                              ? OrderFulfillmentStatus.Processing
                              : OrderFulfillmentStatus.Shipped,
                          onSaved: refresh,
                        }),
                    },
                    {
                      key: "shipping",
                      label: fulfillment.shippingItem ? "Edit tracking" : "Create shipment",
                      onClick: () =>
                        shippingItemModal.push({
                          mode: fulfillment.shippingItem ? "edit" : "create",
                          orderId: order!.id,
                          fulfillmentId: fulfillment.id,
                          shippingItemId: fulfillment.shippingItem?.id,

                          shippingMethodId: fulfillment.shippingItem?.shippingMethod.id,
                          trackingCode: fulfillment.shippingItem?.trackingCode,
                          onSaved: refresh,
                        }),
                    },
                  ],
                }}
              >
                <Button type="text" icon={<MoreOutlined />} />
              </Dropdown>
            ) : null
          }
        />
        {fulfillment ? (
          <Table<ApiOrder["orderItems"][number]>
            className={styles.table}
            tableLayout="fixed"
            rowKey="id"
            pagination={false}
            columns={activeProductColumns}
            dataSource={fulfillment.orderItems}
            locale={{ emptyText: "No products" }}
          />
        ) : (
          <Table
            className={styles.table}
            tableLayout="fixed"
            rowKey="id"
            pagination={false}
            columns={draftProductColumns}
            dataSource={items.fields}
            locale={{ emptyText: "No products" }}
          />
        )}
        {fulfillment?.status === OrderFulfillmentStatus.Pending ? (
          <Space.Compact style={{ marginTop: 16 }}>
            <Button
              onClick={() =>
                shippingItemModal.push({
                  mode: fulfillment.shippingItem ? "edit" : "create",
                  orderId: order!.id,
                  fulfillmentId: fulfillment.id,
                  shippingItemId: fulfillment.shippingItem?.id,

                  shippingMethodId: fulfillment.shippingItem?.shippingMethod.id,
                  trackingCode: fulfillment.shippingItem?.trackingCode,
                  onSaved: refresh,
                })
              }
            >
              Ship products
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: "fulfilled",
                    label: "Mark as fulfilled",
                    onClick: () =>
                      fulfillmentStatusModal.push({
                        orderId: order!.id,
                        fulfillmentId: fulfillment.id,

                        currentStatus: fulfillment.status,
                        nextStatus: OrderFulfillmentStatus.Fulfilled,
                        onSaved: refresh,
                      }),
                  },
                  {
                    key: "hold",
                    label: "Hold fulfillment",
                    onClick: () =>
                      fulfillmentStatusModal.push({
                        orderId: order!.id,
                        fulfillmentId: fulfillment.id,

                        currentStatus: fulfillment.status,
                        nextStatus: OrderFulfillmentStatus.OnHold,
                        onSaved: refresh,
                      }),
                  },
                  {
                    key: "cancel",
                    label: "Cancel",
                    danger: true,
                    onClick: () =>
                      fulfillmentStatusModal.push({
                        orderId: order!.id,
                        fulfillmentId: fulfillment.id,

                        currentStatus: fulfillment.status,
                        nextStatus: OrderFulfillmentStatus.Cancelled,
                        onSaved: refresh,
                      }),
                  },
                ],
              }}
            >
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space.Compact>
        ) : null}
        {fulfillment?.shippingItem ? (
          <>
            <div style={{ margin: "16px 0", borderTop: "1px solid rgba(5,5,5,.06)" }} />
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
  };

  const addressSame =
    order?.billingAddress &&
    order.shippingAddress &&
    addressText(order.billingAddress) === addressText(order.shippingAddress);

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="order-editor"
        header={
          <ModalHeader
            name="order-editor"
            title={order ? `Order #${order.orderNumber}` : "New order"}
            onClose={pop}
            extra={
              order ? (
                <AdminAppExtensionPoint
                  point="orders.details.header.actions"
                  context={{ orderId: order.id }}
                />
              ) : null
            }
            submitButtonProps={
              isEdit
                ? null
                : {
                    children: "Create",
                    onClick: handleSubmit(submitOrder),
                    loading: saving,
                    disabled: saving || !isValid,
                  }
            }
          />
        }
      >
        {query.error || createMutation.error || updateMutation.error ? (
          <Alert
            type="error"
            showIcon
            message={(query.error ?? createMutation.error ?? updateMutation.error)?.message}
          />
        ) : null}
        {globalErrors.length ? (
          <Alert
            type="error"
            showIcon
            message="Could not update order"
            description={globalErrors.join(" ")}
          />
        ) : null}
        <Flex vertical gap={12} style={{ width: "100%" }}>
          {order ? (
            order.status === OrderStatus.Draft ? (
              <DraftFulfillment order={order} refetch={refresh} />
            ) : (
              order.fulfillments.map((fulfillment) => (
                <div key={fulfillment.id}>
                  <AdminAppExtensionPoint
                    point="orders.details.fulfillment.actions"
                    context={{ orderId: order.id, fulfillmentId: fulfillment.id }}
                  />
                  <ActiveFulfillment
                    order={order}
                    fulfillment={fulfillment}
                    parent={
                      fulfillment.parentId
                        ? (order.fulfillments.find((item) => item.id === fulfillment.parentId) ??
                          null)
                        : null
                    }
                    refetch={refresh}
                  />
                  <AdminAppExtensionPoint
                    point="orders.details.fulfillment.after"
                    context={{ orderId: order.id, fulfillmentId: fulfillment.id }}
                  />
                </div>
              ))
            )
          ) : (
            renderProducts()
          )}

          {order ? (
            <PaymentSummary order={order} refetch={refresh} />
          ) : (
            <Paper>
              <PaperHeader title="Payment" />
              <Descriptions
                bordered
                size="small"
                column={1}
                items={[
                  { key: "subtotal", label: "Subtotal", children: <OrderPrice amount={0} /> },
                  {
                    key: "discount",
                    label: "Discount",
                    children: <Typography.Text type="secondary">Not set</Typography.Text>,
                  },
                  {
                    key: "shipping",
                    label: "Shipping",
                    children: <Typography.Text type="secondary">Not set</Typography.Text>,
                  },
                  {
                    key: "total",
                    label: <Typography.Text strong>Total</Typography.Text>,
                    children: (
                      <Typography.Text strong>
                        <OrderPrice amount={0} />
                      </Typography.Text>
                    ),
                  },
                ]}
              />
            </Paper>
          )}

          <Paper>
            <PaperHeader
              title="Quick note"
              actions={
                !editingNote && order ? (
                  <Button icon={<EditOutlined />} onClick={() => setEditingNote(true)} />
                ) : null
              }
            />
            {editingNote ? (
              <>
                <Input.TextArea
                  autoFocus
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={2000}
                />
                <Typography.Text type="secondary">
                  The note is not visible to the customer
                </Typography.Text>
                <Flex gap="small" style={{ marginTop: 16 }}>
                  <Button type="primary" loading={noteMutation.loading} onClick={saveNote}>
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingNote(false);
                      setNote(order?.adminNote ?? "");
                    }}
                  >
                    Cancel
                  </Button>
                </Flex>
              </>
            ) : (
              <Typography.Text
                className={styles.note}
                type={order?.adminNote ? undefined : "secondary"}
                italic={!order?.adminNote}
                onClick={() => order && setEditingNote(true)}
              >
                {order?.adminNote || "Leave a quick note"}
              </Typography.Text>
            )}
          </Paper>
          {order ? (
            <AdminAppExtensionPoint
              point="orders.details.primary.after"
              context={{ orderId: order.id }}
            />
          ) : null}

          <Paper>
            <PaperHeader title="Order info" />
            <div className={styles.row}>
              <Typography.Text>Status</Typography.Text>
              {order ? (
                <Tag color={orderStatusConfig[order.status].color}>
                  {orderStatusConfig[order.status].label}
                </Tag>
              ) : (
                <Tag>Draft</Tag>
              )}
            </div>
            <div className={styles.row}>
              <Typography.Text className={styles.label}>Created:</Typography.Text>
              <Typography.Text>
                {order ? new Date(order.createdAt).toLocaleString() : "Not created"}
              </Typography.Text>
            </div>
            <div className={styles.row}>
              <Typography.Text className={styles.label}>Last update:</Typography.Text>
              <Typography.Text>
                {order ? new Date(order.updatedAt).toLocaleString() : "—"}
              </Typography.Text>
            </div>
            {order?.status === OrderStatus.Draft ? (
              <Space.Compact block style={{ marginTop: 16 }}>
                <Button
                  block
                  disabled={!order.orderItems.length}
                  onClick={() =>
                    orderStatusModal.push({
                      entityId: order.id,

                      nextStatus: OrderStatus.Active,
                      onSaved: refresh,
                    })
                  }
                >
                  Confirm order
                </Button>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: "cancel",
                        danger: true,
                        label: "Cancel order",
                        onClick: () =>
                          orderStatusModal.push({
                            entityId: order.id,

                            nextStatus: OrderStatus.Cancelled,
                            onSaved: refresh,
                          }),
                      },
                    ],
                  }}
                >
                  <Button icon={<MoreOutlined />} />
                </Dropdown>
              </Space.Compact>
            ) : null}
            {order?.status === OrderStatus.Active ? (
              <Button
                block
                type="primary"
                style={{ marginTop: 16 }}
                onClick={() =>
                  orderStatusModal.push({
                    entityId: order.id,

                    nextStatus: OrderStatus.Completed,
                    onSaved: refresh,
                  })
                }
              >
                Complete order
              </Button>
            ) : null}
          </Paper>

          <Paper>
            <PaperHeader
              title="Customer"
              actions={
                order?.status === OrderStatus.Draft && order.customer ? (
                  <Button
                    icon={<CloseOutlined />}
                    onClick={async () => {
                      const confirmed = await modal.confirm({
                        title: "Unlink customer?",
                        okText: "Yes",
                        cancelText: "No",
                      });
                      if (!confirmed) return;
                      const result = await customerMutation.updateOrderCustomer({
                        id: order.id,

                        customerId: null,
                      });
                      if (result.order) await refresh();
                    }}
                  />
                ) : null
              }
            />
            {order?.customer ? (
              <Flex align="center" gap="small">
                <Avatar>
                  {order.customerDetails.firstName[0]}
                  {order.customerDetails.lastName[0]}
                </Avatar>
                <Typography.Text>{order.customer.displayName}</Typography.Text>
              </Flex>
            ) : (
              <>
                <Typography.Text>No customer</Typography.Text>
                <Typography.Paragraph type="secondary">
                  Guest checkout allows users to make purchases without creating an account.
                </Typography.Paragraph>
              </>
            )}
            {!order ? (
              <Controller
                name="customerId"
                control={control}
                render={({ field }) => <Input {...field} placeholder="Customer ID (optional)" />}
              />
            ) : null}
          </Paper>

          <Paper>
            <PaperHeader title="Contact info" />
            {isEdit ? (
              <Flex vertical gap="small">
                <div>
                  <Typography.Text type="secondary">Full Name</Typography.Text>
                  <br />
                  <Typography.Text copyable>
                    {order!.customerDetails.firstName} {order!.customerDetails.lastName}
                  </Typography.Text>
                </div>
                <div>
                  <Typography.Text type="secondary">Email</Typography.Text>
                  <br />
                  <Typography.Text copyable>
                    {order!.customerDetails.email || "No email provided"}
                  </Typography.Text>
                </div>
                <div>
                  <Typography.Text type="secondary">Phone</Typography.Text>
                  <br />
                  <Typography.Text copyable={Boolean(order!.customerDetails.phone)}>
                    {order!.customerDetails.phone || "No phone provided"}
                  </Typography.Text>
                </div>
                <div>
                  <Typography.Text type="secondary">Note</Typography.Text>
                  <br />
                  <Typography.Text copyable={Boolean(order!.customerDetails.note)}>
                    {order!.customerDetails.note || "No note provided"}
                  </Typography.Text>
                </div>
                {order!.customer ? (
                  <Typography.Text type="secondary">
                    The contact information may be different from the customer&apos;s profile.
                  </Typography.Text>
                ) : null}
              </Flex>
            ) : (
              <div className={styles.fields}>
                <Controller
                  name="firstName"
                  control={control}
                  render={({ field }) => <Input {...field} placeholder="First name" />}
                />
                <Controller
                  name="lastName"
                  control={control}
                  render={({ field }) => <Input {...field} placeholder="Last name" />}
                />
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Email"
                      status={errors.email ? "error" : undefined}
                    />
                  )}
                />
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => <Input {...field} placeholder="Phone" />}
                />
              </div>
            )}
          </Paper>

          <Paper>
            <PaperHeader
              title="Shipping details"
              actions={
                order ? (
                  <Button
                    icon={<EditOutlined />}
                    onClick={() =>
                      shippingDetailsModal.push({
                        orderId: order.id,

                        onSaved: refresh,
                      })
                    }
                  />
                ) : null
              }
            />
            <Typography.Text type="secondary">Shipping method</Typography.Text>
            <br />
            <Typography.Text>{order?.shippingMethod?.name ?? "No method"}</Typography.Text>
            <div style={{ marginTop: 12 }}>
              <Typography.Text type="secondary">Shipping address</Typography.Text>
              <br />
              <Typography.Text className={styles.address}>
                {addressText(order?.shippingAddress ?? null)}
              </Typography.Text>
            </div>
            {!order ? (
              <Controller
                name="shippingMethodId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={[
                      { value: "standard", label: "Standard" },
                      { value: "express", label: "Express" },
                    ]}
                    style={{ width: "100%", marginTop: 12 }}
                  />
                )}
              />
            ) : null}
          </Paper>
          {order ? (
            <AdminAppExtensionPoint
              point="orders.details.shipping.after"
              context={{ orderId: order.id, fulfillmentId: order.fulfillments[0]?.id }}
            />
          ) : null}

          <Paper>
            <PaperHeader
              title="Payment details"
              actions={
                order ? (
                  <Button
                    icon={<EditOutlined />}
                    onClick={() =>
                      paymentDetailsModal.push({
                        orderId: order.id,

                        onSaved: refresh,
                      })
                    }
                  />
                ) : null
              }
            />
            <Typography.Text type="secondary">Payment method</Typography.Text>
            <br />
            <Typography.Text>{order?.paymentMethod?.name ?? "No method"}</Typography.Text>
            <div style={{ marginTop: 12 }}>
              <Typography.Text type="secondary">Invoice address</Typography.Text>
              <br />
              <Typography.Text className={styles.address}>
                {addressSame
                  ? "Same as shipping address"
                  : addressText(order?.billingAddress ?? null)}
              </Typography.Text>
            </div>
            {!order ? (
              <Controller
                name="paymentMethodId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={[
                      { value: "card", label: "Credit card" },
                      { value: "cod", label: "Cash on delivery" },
                    ]}
                    style={{ width: "100%", marginTop: 12 }}
                  />
                )}
              />
            ) : null}
          </Paper>
          {order ? (
            <AdminAppExtensionPoint
              point="orders.details.payment.after"
              context={{ orderId: order.id, paymentId: order.paymentItem?.id }}
            />
          ) : null}

          <Paper>
            <PaperHeader title="Tags" />
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  mode="tags"
                  open={false}
                  style={{ width: "100%" }}
                  onBlur={async () => {
                    field.onBlur();
                    if (!order) return;
                    const result = await tagsMutation.updateOrderTags({
                      id: order.id,

                      tags: field.value,
                    });
                    if (result.order) await refresh();
                  }}
                />
              )}
            />
          </Paper>
          {order ? (
            <AdminAppExtensionPoint
              point="orders.details.sidebar.after"
              context={{ orderId: order.id }}
            />
          ) : null}

          <section className={styles.timelineSection}>
            <Typography.Title level={5} className={styles.timelineTitle}>
              Timeline
            </Typography.Title>
            {order ? (
              <>
                <Paper className={styles.commentPaper}>
                  <Avatar shape="square">A</Avatar>
                  <Input.TextArea
                    variant="borderless"
                    autoSize={{ minRows: 1, maxRows: 10 }}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    maxLength={500}
                    placeholder="Leave a comment..."
                  />
                  <Button
                    type="primary"
                    size="large"
                    loading={commentMutation.loading}
                    disabled={!comment.trim()}
                    onClick={saveComment}
                  >
                    Send
                  </Button>
                </Paper>
                <Timeline
                  style={{ marginTop: 24, paddingLeft: 72 }}
                  items={order.events.map((event) => ({
                    children: (
                      <div style={{ width: "100%" }}>
                        <Flex justify="space-between">
                          <Flex gap="small">
                            <Typography.Text strong>
                              {event.type === "COMMENT" ? "Comment added" : event.message}
                            </Typography.Text>
                            {event.actorName ? (
                              <Typography.Text type="secondary" code>
                                {event.actorName}
                              </Typography.Text>
                            ) : null}
                          </Flex>
                          <Typography.Text type="secondary">
                            {new Date(event.createdAt).toLocaleString()}
                          </Typography.Text>
                        </Flex>
                        {event.type === "COMMENT" ? (
                          <Typography.Text italic>{event.message}</Typography.Text>
                        ) : null}
                      </div>
                    ),
                  }))}
                />
              </>
            ) : (
              <Typography.Text type="secondary">
                Activity appears after the order is created.
              </Typography.Text>
            )}
          </section>
        </Flex>
      </ModalLayout>
    </FormProvider>
  );
}
