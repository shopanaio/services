"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Flex, Input } from "antd";
import { LuShoppingBag as ShoppingOutlined } from "react-icons/lu";
import { useProductPicker, useVariantPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  reviewSubjectSectionSchema,
  type ReviewSubjectSectionValues,
} from "../review-modal/schema";
import { useReviewFormStyles } from "../shared/review-form.styles";
import {
  ReviewFormField,
  ReviewModalFrame,
  useReviewSectionModal,
} from "../shared/review-section-modal";

interface VariantPickerEntity extends IPickableEntity {
  productId?: string;
}

export function EditReviewSubjectModal() {
  const { styles } = useReviewFormStyles();
  const state = useReviewSectionModal("Product and purchase updated");
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const [product, setProduct] = useState<IPickableEntity | null>(null);
  const [variant, setVariant] = useState<VariantPickerEntity | null>(null);
  const [variantNotice, setVariantNotice] = useState(false);
  const form = useForm<ReviewSubjectSectionValues>({
    resolver: zodResolver(reviewSubjectSectionSchema),
    defaultValues: { productId: "", variantId: "", orderId: "", orderLineId: "" },
    mode: "onChange",
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty, isValid },
  } = form;
  const productId = watch("productId");
  const variantId = watch("variantId");

  useEffect(() => {
    if (!state.review) return;
    if (initialized.current && lastReload.current === state.reloadVersion) return;
    setProduct({ id: state.review.product.id, title: state.review.product.title });
    setVariant(
      state.review.variant
        ? {
            id: state.review.variant.id,
            title: state.review.variant.title ?? state.review.variant.id,
            productId: state.review.product.id,
          }
        : null,
    );
    setVariantNotice(false);
    reset({
      productId: state.review.product.id,
      variantId: state.review.variant?.id ?? "",
      orderId: state.review.orderId ?? "",
      orderLineId: state.review.orderLineId ?? "",
    });
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.reloadVersion, state.review]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);

  const productPicker = useProductPicker({
    selectionMode: "single",
    initialSelection: productId ? [productId] : [],
    onConfirm: (items) => {
      const selected = items[0] ?? null;
      if (!selected) return;
      if (selected.id !== productId && variantId) {
        setVariant(null);
        setValue("variantId", "", { shouldDirty: true, shouldValidate: true });
        setVariantNotice(true);
      }
      setProduct(selected);
      setValue("productId", selected.id, { shouldDirty: true, shouldValidate: true });
    },
  });
  const variantPicker = useVariantPicker({
    selectionMode: "single",
    initialSelection: variantId ? [variantId] : [],
    queryMeta: { productId },
    onConfirm: (items) => {
      const selected = (items[0] as VariantPickerEntity | undefined) ?? null;
      setVariant(selected);
      setVariantNotice(false);
      setValue("variantId", selected?.id ?? "", { shouldDirty: true, shouldValidate: true });
    },
  });

  const submit = handleSubmit(async (values) => {
    await state.save<ReviewSubjectSectionValues>(
      {
        subject: {
          productId: values.productId,
          variantId: values.variantId || null,
          orderId: values.orderId.trim() || null,
          orderLineId: values.orderLineId.trim() || null,
        },
      },
      {
        "subject.productId": "productId",
        "subject.variantId": "variantId",
        "subject.orderId": "orderId",
        "subject.orderLineId": "orderLineId",
      },
      setError,
    );
  });

  return (
    <ReviewModalFrame
      name="review-edit-subject"
      title="Edit product & purchase"
      loading={state.mutationLoading}
      disabled={!isDirty || !isValid || !state.review || state.conflict}
      onSubmit={() => void submit()}
      onClose={state.pop}
      queryLoading={state.queryLoading}
      hasReview={Boolean(state.review)}
      error={state.error}
      conflict={state.conflict}
      onReload={() => void state.reloadLatest()}
    >
      {state.review ? (
        <>
          <Paper>
            <PaperHeader title="Review subject" />
            <Flex vertical gap="middle">
              <ReviewFormField label="Product *" error={errors.productId?.message}>
                <Flex gap="small">
                  <Input
                    readOnly
                    value={product?.title ?? ""}
                    status={errors.productId ? "error" : undefined}
                  />
                  <Button autoFocus icon={<ShoppingOutlined />} onClick={productPicker.openPicker}>
                    Select
                  </Button>
                </Flex>
              </ReviewFormField>
              <ReviewFormField
                label="Variant"
                error={errors.variantId?.message}
                help="Variant options are restricted to the selected product."
              >
                <Flex gap="small">
                  <Input readOnly allowClear value={variant?.title ?? ""} />
                  <Button disabled={!productId} onClick={variantPicker.openPicker}>
                    Select
                  </Button>
                  {variantId ? (
                    <Button
                      onClick={() => {
                        setVariant(null);
                        setValue("variantId", "", { shouldDirty: true, shouldValidate: true });
                      }}
                    >
                      Clear
                    </Button>
                  ) : null}
                </Flex>
              </ReviewFormField>
              {variantNotice ? (
                <Alert
                  type="info"
                  showIcon
                  message="The previous variant was cleared because it does not belong to the selected product."
                />
              ) : null}
            </Flex>
          </Paper>
          <Paper>
            <PaperHeader title="Order evidence" />
            <div className={styles.fieldGrid}>
              <ReviewFormField label="Order ID" error={errors.orderId?.message}>
                <Controller
                  name="orderId"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} allowClear status={errors.orderId ? "error" : undefined} />
                  )}
                />
              </ReviewFormField>
              <ReviewFormField label="Order line ID" error={errors.orderLineId?.message}>
                <Controller
                  name="orderLineId"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      allowClear
                      status={errors.orderLineId ? "error" : undefined}
                    />
                  )}
                />
              </ReviewFormField>
            </div>
          </Paper>
        </>
      ) : null}
    </ReviewModalFrame>
  );
}
