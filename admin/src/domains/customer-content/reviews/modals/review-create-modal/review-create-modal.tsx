"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Flex, Input, Rate, Select, Typography } from "antd";
import { LuShoppingBag as ShoppingOutlined, LuUser as UserOutlined } from "react-icons/lu";
import {
  ReviewContentAuthorType,
  ReviewContentStatus,
  ReviewVerificationStatus,
} from "@/graphql/types";
import { shopLocales } from "@/defs/localization";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useEntityPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import "@/shared/components/entity-picker-modal/configs/product-picker-config";
import "@/domains/customers/all-customers/picker/customer-picker-config";
import { useCreateReview } from "../../hooks";
import type { ReviewCreateModalPayload } from "../../modals";

export function ReviewCreateModal() {
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const value = payload as ReviewCreateModalPayload;
  const mutation = useCreateReview();
  const [product, setProduct] = useState<IPickableEntity | null>(null);
  const [customer, setCustomer] = useState<IPickableEntity | null>(null);
  const [locale, setLocale] = useState("en");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const dirty = !!product || !!customer || locale !== "en" || rating !== 5 || !!title || !!body;
  useEffect(() => setDirty(dirty), [dirty, setDirty]);

  const productPicker = useEntityPicker<IPickableEntity>({
    entityType: "product",
    selectionMode: "single",
    initialSelection: product ? [product.id] : [],
    onConfirm: (items) => setProduct(items[0] ?? null),
  });
  const customerPicker = useEntityPicker<IPickableEntity>({
    entityType: "customer",
    selectionMode: "single",
    initialSelection: customer ? [customer.id] : [],
    onConfirm: (items) => setCustomer(items[0] ?? null),
  });
  const canSubmit = useMemo(
    () => !!product && !!customer && body.trim().length >= 20,
    [body, customer, product],
  );

  const submit = async () => {
    if (!product || !customer) return;
    setError(null);
    const result = await mutation.createReview({
      productId: product.id,
      rating,
      content: {
        title: title.trim() || null,
        body: body.trim(),
        locale,
        author: {
          type: ReviewContentAuthorType.Customer,
          customerId: customer.id,
          displayName: customer.title,
        },
        source: { channel: "ADMIN" },
        status: ReviewContentStatus.Pending,
      },
      verification: { status: ReviewVerificationStatus.Unverified },
    });
    if (!result.review || result.userErrors.length)
      return setError(
        result.userErrors.map((item) => item.message).join(" ") || "Unable to create review",
      );
    await value.onSaved?.();
    setDirty(false);
    message.success("Review created");
    forcePop();
  };

  return (
    <ModalLayout
      name="review-create"
      header={
        <ModalHeader
          name="review-create"
          title="New review"
          onClose={pop}
          submitButtonProps={{
            children: "Create",
            loading: mutation.loading,
            disabled: !canSubmit,
            onClick: submit,
          }}
        />
      }
    >
      {mutation.error ? <Alert type="error" showIcon message={mutation.error.message} /> : null}
      {error ? <Alert type="error" showIcon message={error} /> : null}
      <Paper>
        <PaperHeader title="Basic information" />
        <Flex vertical gap="middle">
          <div>
            <Typography.Text strong>Product *</Typography.Text>
            <Flex gap="small" style={{ marginTop: 8 }}>
              <Input readOnly value={product?.title ?? ""} placeholder="Select a product" />
              <Button icon={<ShoppingOutlined />} onClick={productPicker.openPicker}>
                Select
              </Button>
            </Flex>
          </div>
          <div>
            <Typography.Text strong>Customer *</Typography.Text>
            <Flex gap="small" style={{ marginTop: 8 }}>
              <Input readOnly value={customer?.title ?? ""} placeholder="Select a customer" />
              <Button icon={<UserOutlined />} onClick={customerPicker.openPicker}>
                Select
              </Button>
            </Flex>
          </div>
          <div>
            <Typography.Text strong>Locale *</Typography.Text>
            <Select
              value={locale}
              onChange={setLocale}
              options={shopLocales.map((item) => ({ value: item.value, label: item.name }))}
              style={{ width: "100%", marginTop: 8 }}
              showSearch
            />
          </div>
          <div>
            <Typography.Text strong>Rating *</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Rate value={rating} onChange={setRating} />
            </div>
          </div>
          <div>
            <Typography.Text strong>Title</Typography.Text>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={150}
              showCount
              style={{ marginTop: 8 }}
            />
          </div>
          <div>
            <Typography.Text strong>Review *</Typography.Text>
            <Input.TextArea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              autoSize={{ minRows: 5, maxRows: 10 }}
              maxLength={5000}
              showCount
              placeholder="At least 20 characters"
              style={{ marginTop: 8 }}
            />
          </div>
        </Flex>
      </Paper>
    </ModalLayout>
  );
}
