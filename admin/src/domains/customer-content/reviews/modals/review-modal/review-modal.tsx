"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  App,
  Flex,
  Input,
  InputNumber,
  Rate,
  Segmented,
  Select,
  Skeleton,
  Switch,
  Tag,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DislikeOutlined,
  FlagOutlined,
  LikeOutlined,
  SafetyCertificateOutlined,
  ShoppingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  MediaSection as ProductDetailsMediaSection,
} from "@/domains/inventory/products/components/product-details-card/sections";
import { useEditMediaModal } from "@/domains/inventory/products/modals";
import type { ApiFile } from "@/graphql/types";
import type { ReviewModalPayload } from "../../modals";
import {
  useCreateReview,
  useReview,
  useReviewEditorContext,
  useUpdateReview,
} from "../../hooks";
import {
  ReviewReportReason,
  ReviewStatus,
} from "../../graphql/operation-types";
import {
  buildReviewCreateInput,
  buildReviewUpdateInput,
  mapReviewUserErrors,
} from "../../mappers";
import { reviewFormSchema, type ReviewFormValues } from "./schema";

const useStyles = createStyles(({ token }) => ({
  fields: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: token.padding,
    "@media (max-width: 640px)": { gridTemplateColumns: "1fr" },
  },
  label: {
    display: "block",
    marginBottom: 6,
    color: token.colorText,
    fontWeight: 500,
  },
  error: { color: token.colorError, fontSize: 12, marginTop: 4 },
  help: { color: token.colorTextSecondary, fontSize: 13, marginTop: 4 },
  fullWidth: { gridColumn: "1 / -1" },
  ratingInput: { width: 88 },
  ratingPreview: {
    fontSize: 22,
    "&.ant-rate-disabled": { cursor: "default" },
    "&.ant-rate-disabled .ant-rate-star": { cursor: "default" },
  },
  switchRow: {
    padding: token.paddingSM,
    borderRadius: token.borderRadius,
    background: token.colorFillAlter,
  },
  moderationInfo: {
    padding: token.paddingSM,
    borderRadius: token.borderRadius,
    background: token.colorFillAlter,
  },
  engagementGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: token.paddingSM,
    "@media (max-width: 640px)": { gridTemplateColumns: "1fr" },
  },
  engagementMetric: {
    padding: token.paddingSM,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    background: token.colorFillAlter,
  },
  metricIcon: { color: token.colorTextSecondary, fontSize: 18 },
  metricValue: { margin: "0 !important" },
  reportsList: {
    overflow: "hidden",
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
  },
  reportRow: {
    padding: token.paddingSM,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": { borderBottom: 0 },
  },
}));

const DEFAULT_VALUES: ReviewFormValues = {
  productId: "",
  customerId: "",
  rating: 5,
  title: "",
  body: "",
  isVerifiedPurchase: false,
  status: ReviewStatus.Pending,
  moderationNote: "",
  media: [],
};

const moderationCopy: Record<ReviewStatus, { title: string; description: string; color: string }> = {
  [ReviewStatus.Pending]: {
    title: "Pending review",
    description: "Hidden from the storefront until a moderator makes a decision.",
    color: "gold",
  },
  [ReviewStatus.Published]: {
    title: "Published",
    description: "Visible on the product page and included in rating aggregates.",
    color: "green",
  },
  [ReviewStatus.Rejected]: {
    title: "Rejected",
    description: "Hidden from customers and excluded from rating aggregates.",
    color: "red",
  },
};

const reportReasonCopy: Record<ReviewReportReason, string> = {
  [ReviewReportReason.Spam]: "Spam or promotion",
  [ReviewReportReason.Offensive]: "Offensive content",
  [ReviewReportReason.ConflictOfInterest]: "Conflict of interest",
  [ReviewReportReason.NotRelevant]: "Not relevant to product",
  [ReviewReportReason.Other]: "Other",
};

const reportDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function ReviewModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as ReviewModalPayload;
  const isEdit = typedPayload.mode === "edit";
  const reviewQuery = useReview(isEdit ? typedPayload.entityId : undefined);
  const editorContext = useReviewEditorContext();
  const { createReview, loading: creating, error: createError } = useCreateReview();
  const { updateReview, loading: updating, error: updateError } = useUpdateReview();
  const { push: openEditMediaModal } = useEditMediaModal();
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);

  const methods = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: DEFAULT_VALUES,
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
  const status = useWatch({ control, name: "status" });
  const media = useWatch({ control, name: "media" });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  useEffect(() => {
    if (!isEdit || !reviewQuery.review) return;
    const review = reviewQuery.review;
    reset({
      productId: review.product.id,
      customerId: review.customer.id,
      rating: review.rating,
      title: review.title ?? "",
      body: review.body,
      isVerifiedPurchase: review.isVerifiedPurchase,
      status: review.status,
      moderationNote: review.moderationNote ?? "",
      media: review.media,
    });
  }, [isEdit, reset, reviewQuery.review]);

  const productOptions = useMemo(
    () => editorContext.context?.products.map((product) => ({
      value: product.id,
      label: product.title,
    })) ?? [],
    [editorContext.context?.products],
  );
  const customerOptions = useMemo(
    () => editorContext.context?.customers.map((customer) => ({
      value: customer.id,
      label: `${customer.displayName} · ${customer.email}`,
    })) ?? [],
    [editorContext.context?.customers],
  );

  const handleEditMedia = useCallback(() => {
    openEditMediaModal({
      title: "Edit review media",
      galleryTitle: "Customer photos and videos",
      featured: null,
      gallery: media,
      hasFeatured: false,
      allowSetFeatured: false,
      showUpload: true,
      allowDelete: true,
      accept: "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm",
      maxSize: 50,
      maxFiles: 8,
      onSave: ({ gallery }: { gallery: ApiFile[] }) => {
        methods.setValue("media", gallery, {
          shouldDirty: true,
          shouldValidate: true,
        });
      },
    });
  }, [media, methods, openEditMediaModal]);

  const onSubmit = useCallback(
    async (values: ReviewFormValues) => {
      setGlobalErrors([]);
      clearErrors();
      const current = reviewQuery.review;
      const result = isEdit && current
        ? await updateReview(buildReviewUpdateInput(values, current), values.media)
        : await createReview(buildReviewCreateInput(values), values.media);

      if (!result.review || result.userErrors.length > 0) {
        const global: string[] = [];
        mapReviewUserErrors(result.userErrors).forEach((error) => {
          if (error.field) setError(error.field, { message: error.message });
          else global.push(error.message);
        });
        setGlobalErrors(global);
        return;
      }

      await typedPayload.onSaved?.();
      setDirty(false);
      message.success(isEdit ? "Review updated" : "Review created");
      forcePop();
    },
    [clearErrors, createReview, forcePop, isEdit, message, reviewQuery.review, setDirty, setError, typedPayload, updateReview],
  );

  const loading = editorContext.loading || (isEdit && reviewQuery.loading);
  const saving = creating || updating;
  const transportError = editorContext.error ?? reviewQuery.error ?? createError ?? updateError;
  const title = isEdit ? "Edit review" : "New review";
  const moderation = moderationCopy[status];

  if (loading) {
    return (
      <ModalLayout
        name="review-editor"
        header={<ModalHeader title={title} onClose={pop} submitButtonProps={{ disabled: true }} />}
      >
        <Skeleton active paragraph={{ rows: 12 }} />
      </ModalLayout>
    );
  }

  if (isEdit && !reviewQuery.review) {
    return (
      <ModalLayout name="review-editor" headerProps={{ title, onClose: pop, submitButtonProps: null }}>
        <Alert type="error" showIcon message="Review not found" />
      </ModalLayout>
    );
  }

  return (
    <FormProvider {...methods}>
      <ModalLayout
      name="review-editor"
      header={
        <ModalHeader
          name="review-editor"
          title={title}
          onClose={pop}
          extra={<Tag color={moderation.color}>{moderation.title}</Tag>}
          submitButtonProps={{
            children: isEdit ? "Save" : "Create",
            loading: saving,
            disabled: saving || !isValid || (isEdit && !isDirty),
            onClick: handleSubmit(onSubmit),
          }}
        />
      }
    >
      {transportError ? <Alert type="error" showIcon message={transportError.message} /> : null}
      {globalErrors.length > 0 ? (
        <Alert
          type="error"
          showIcon
          message="Could not save review"
          description={globalErrors.join(" ")}
        />
      ) : null}

      <Paper>
        <PaperHeader title="Associations" />
        <div className={styles.fields}>
          <div>
            <label className={styles.label} htmlFor="review-product">
              <ShoppingOutlined /> Product *
            </label>
            <Controller
              name="productId"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  id="review-product"
                  showSearch
                  optionFilterProp="label"
                  options={productOptions}
                  placeholder="Select product"
                  status={errors.productId ? "error" : undefined}
                  style={{ width: "100%" }}
                />
              )}
            />
            {errors.productId ? <div className={styles.error}>{errors.productId.message}</div> : null}
          </div>
          <div>
            <label className={styles.label} htmlFor="review-customer">
              <UserOutlined /> Customer *
            </label>
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  id="review-customer"
                  showSearch
                  optionFilterProp="label"
                  options={customerOptions}
                  placeholder="Select customer"
                  status={errors.customerId ? "error" : undefined}
                  style={{ width: "100%" }}
                />
              )}
            />
            {errors.customerId ? <div className={styles.error}>{errors.customerId.message}</div> : null}
          </div>
        </div>
      </Paper>

      <Paper>
        <PaperHeader title="Review content" />
        <div className={styles.fields}>
          <div className={styles.fullWidth}>
            <label className={styles.label}>Rating *</label>
            <Controller
              name="rating"
              control={control}
              render={({ field }) => (
                <Flex align="center" gap="middle">
                  <InputNumber
                    id="review-rating"
                    aria-label="Rating from 1 to 5"
                    className={styles.ratingInput}
                    min={1}
                    max={5}
                    step={1}
                    precision={0}
                    value={field.value}
                    status={errors.rating ? "error" : undefined}
                    onChange={(value) => field.onChange(value ?? 1)}
                  />
                  <Rate
                    disabled
                    className={styles.ratingPreview}
                    value={field.value}
                  />
                  <Typography.Text type="secondary">
                    {field.value} / 5
                  </Typography.Text>
                </Flex>
              )}
            />
            {errors.rating ? <div className={styles.error}>{errors.rating.message}</div> : null}
          </div>
          <div className={styles.fullWidth}>
            <label className={styles.label} htmlFor="review-title">Title</label>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="review-title"
                  maxLength={150}
                  showCount
                  placeholder="Summarize the experience"
                  status={errors.title ? "error" : undefined}
                />
              )}
            />
            {errors.title ? <div className={styles.error}>{errors.title.message}</div> : null}
          </div>
          <div className={styles.fullWidth}>
            <label className={styles.label} htmlFor="review-body">Review *</label>
            <Controller
              name="body"
              control={control}
              render={({ field }) => (
                <Input.TextArea
                  {...field}
                  id="review-body"
                  autoSize={{ minRows: 5, maxRows: 12 }}
                  maxLength={5000}
                  showCount
                  placeholder="Describe the customer's experience with the product"
                  status={errors.body ? "error" : undefined}
                />
              )}
            />
            {errors.body ? <div className={styles.error}>{errors.body.message}</div> : null}
          </div>
        </div>
      </Paper>

      <ProductDetailsMediaSection
        mediaFiles={media}
        onEdit={handleEditMedia}
        title="Customer media"
        editLabel="Edit media"
        hasFeatured={false}
        testIdPrefix="review-media"
      />
      {errors.media ? <div className={styles.error}>{errors.media.message}</div> : null}

      <Paper>
        <PaperHeader title="Trust signals" icon={<SafetyCertificateOutlined />} />
        <Flex align="center" justify="space-between" gap="middle" className={styles.switchRow}>
          <div>
            <Typography.Text strong>Verified purchase</Typography.Text>
            <br />
            <Typography.Text type="secondary">
              Mark only when the customer's order contains this product.
            </Typography.Text>
          </div>
          <Controller
            name="isVerifiedPurchase"
            control={control}
            render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
          />
        </Flex>
      </Paper>

      <Paper>
        <PaperHeader title="Engagement & abuse reports" />
        <Flex vertical gap="middle">
          <div className={styles.engagementGrid}>
            <Flex vertical gap={4} className={styles.engagementMetric}>
              <Flex align="center" gap="small">
                <LikeOutlined className={styles.metricIcon} />
                <Typography.Text strong>Likes</Typography.Text>
              </Flex>
              <Typography.Title level={4} className={styles.metricValue}>
                {reviewQuery.review?.likeCount ?? 0}
              </Typography.Title>
              <Typography.Text type="secondary">Customers who found the review helpful.</Typography.Text>
            </Flex>
            <Flex vertical gap={4} className={styles.engagementMetric}>
              <Flex align="center" gap="small">
                <DislikeOutlined className={styles.metricIcon} />
                <Typography.Text strong>Dislikes</Typography.Text>
              </Flex>
              <Typography.Title level={4} className={styles.metricValue}>
                {reviewQuery.review?.dislikeCount ?? 0}
              </Typography.Title>
              <Typography.Text type="secondary">Customers who found the review unhelpful.</Typography.Text>
            </Flex>
            <Flex vertical gap={4} className={styles.engagementMetric}>
              <Flex align="center" gap="small">
                <FlagOutlined className={styles.metricIcon} />
                <Typography.Text strong>Abuse reports</Typography.Text>
              </Flex>
              <Typography.Title level={4} className={styles.metricValue}>
                {reviewQuery.review?.reportedCount ?? 0}
              </Typography.Title>
              <Typography.Text type="secondary">Customers who asked to inspect this review.</Typography.Text>
            </Flex>
          </div>

          {(reviewQuery.review?.reports.length ?? 0) > 0 ? (
            <div className={styles.reportsList}>
              {reviewQuery.review?.reports.map((report) => (
                <Flex vertical gap={4} className={styles.reportRow} key={report.id}>
                  <Flex align="center" justify="space-between" gap="small" wrap>
                    <Flex align="center" gap="small" wrap>
                      <Tag color="red">{reportReasonCopy[report.reason]}</Tag>
                      <Typography.Text>{report.reporter.displayName}</Typography.Text>
                      <Typography.Text type="secondary">{report.reporter.email}</Typography.Text>
                    </Flex>
                    <Typography.Text type="secondary">
                      {reportDateFormatter.format(new Date(report.createdAt))}
                    </Typography.Text>
                  </Flex>
                  {report.details ? <Typography.Text>{report.details}</Typography.Text> : null}
                </Flex>
              ))}
            </div>
          ) : (
            <Typography.Text type="secondary">No abuse reports were submitted for this review.</Typography.Text>
          )}
        </Flex>
      </Paper>

      <Paper>
        <PaperHeader title="Moderation" />
        <Flex vertical gap="middle">
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Segmented
                block
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: ReviewStatus.Pending, label: "Pending", icon: <ClockCircleOutlined /> },
                  { value: ReviewStatus.Published, label: "Published", icon: <CheckCircleOutlined /> },
                  { value: ReviewStatus.Rejected, label: "Rejected", icon: <CloseCircleOutlined /> },
                ]}
              />
            )}
          />
          <div className={styles.moderationInfo}>
            <Typography.Text strong>{moderation.title}</Typography.Text>
            <br />
            <Typography.Text type="secondary">{moderation.description}</Typography.Text>
          </div>
          <div>
            <label className={styles.label} htmlFor="review-moderation-note">
              Internal moderation note{status === ReviewStatus.Rejected ? " *" : ""}
            </label>
            <Controller
              name="moderationNote"
              control={control}
              render={({ field }) => (
                <Input.TextArea
                  {...field}
                  id="review-moderation-note"
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  maxLength={1000}
                  showCount
                  placeholder="Document the decision for other moderators"
                  status={errors.moderationNote ? "error" : undefined}
                />
              )}
            />
            {errors.moderationNote ? (
              <div className={styles.error}>{errors.moderationNote.message}</div>
            ) : (
              <div className={styles.help}>This note is never shown to customers.</div>
            )}
          </div>
        </Flex>
      </Paper>
      </ModalLayout>
    </FormProvider>
  );
}
