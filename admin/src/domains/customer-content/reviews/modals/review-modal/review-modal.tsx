"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Flex, Input, Rate, Segmented, Select, Skeleton, Typography } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, ShoppingOutlined, UserOutlined } from "@ant-design/icons";
import type { ApiFile, ApiReviewUpdateInput } from "@/graphql/types";
import { ReviewContentAuthorType, ReviewContentStatus, ReviewVerificationStatus } from "@/graphql/types";
import { shopLocales } from "@/defs/localization";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useEntityPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import "@/shared/components/entity-picker-modal/configs/product-picker-config";
import "@/domains/customers/all-customers/picker/customer-picker-config";
import { MediaSection } from "@/domains/inventory/products/components/product-details-card/sections";
import { useEditMediaModal } from "@/domains/inventory/products/modals";
import { useReview, useUpdateReview } from "../../hooks";
import type { ReviewEditModalPayload, ReviewEditSection } from "../../modals";

const sectionTitle: Record<ReviewEditSection, string> = { content: "Review content", moderation: "Review moderation", trust: "Review trust signals", media: "Review media" };

export function ReviewEditModal() {
  const { message } = App.useApp(); const { payload, pop, forcePop, setDirty } = useModalStackContext(); const value = payload as ReviewEditModalPayload; const section = value.section ?? "content";
  const query = useReview(value.entityId); const mutation = useUpdateReview(); const review = query.review; const mediaModal = useEditMediaModal();
  const [product, setProduct] = useState<IPickableEntity | null>(null); const [customer, setCustomer] = useState<IPickableEntity | null>(null);
  const [authorName, setAuthorName] = useState(""); const [authorEmail, setAuthorEmail] = useState(""); const [locale, setLocale] = useState("en"); const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [rating, setRating] = useState(5);
  const [status, setStatus] = useState(ReviewContentStatus.Pending); const [moderationNote, setModerationNote] = useState(""); const [verification, setVerification] = useState(ReviewVerificationStatus.Unverified); const [media, setMedia] = useState<ApiFile[]>([]);
  const [loadedRevision, setLoadedRevision] = useState<number | null>(null);
  const [dirty, setLocalDirty] = useState(false); const [error, setError] = useState<string | null>(null); useEffect(() => setDirty(dirty), [dirty, setDirty]);
  if (review && loadedRevision !== review.revision) { setLoadedRevision(review.revision); setProduct({ id: review.product.id, title: review.product.title }); setCustomer(review.author.customer ? { id: review.author.customer.id, title: review.author.customer.displayName } : null); setAuthorName(review.author.displayName); setAuthorEmail(review.author.email ?? ""); setLocale(review.locale); setTitle(review.title ?? ""); setBody(review.body); setRating(review.rating); setStatus(review.status); setModerationNote(review.moderationNote ?? ""); setVerification(review.verificationStatus); setMedia(review.media.map((item) => item.file)); setLocalDirty(false); }
  const change = () => setLocalDirty(true);
  const productPicker = useEntityPicker<IPickableEntity>({ entityType: "product", selectionMode: "single", initialSelection: product ? [product.id] : [], onConfirm: (items) => { setProduct(items[0] ?? null); change(); } });
  const customerPicker = useEntityPicker<IPickableEntity>({ entityType: "customer", selectionMode: "single", initialSelection: customer ? [customer.id] : [], allowEmptySelection: true, onConfirm: (items) => { const item = items[0] ?? null; setCustomer(item); if (item) setAuthorName(item.title); change(); } });
  const editMedia = () => mediaModal.push({ title: "Edit review media", galleryTitle: "Customer photos and videos", featured: null, gallery: media, hasFeatured: false, allowSetFeatured: false, showUpload: true, allowDelete: true, maxFiles: 8, onSave: ({ gallery }: { gallery: ApiFile[] }) => { setMedia(gallery); change(); } });
  const save = async () => {
    if (!review) return; setError(null); let operations: ApiReviewUpdateInput;
    if (section === "content") {
      if (!product || !body.trim() || !authorName.trim()) return setError("Product, author and review content are required.");
      operations = { content: { text: { title: title.trim() || null, body: body.trim(), locale }, author: { type: customer ? ReviewContentAuthorType.Customer : review.author.type, customerId: customer?.id ?? null, displayName: authorName.trim(), email: authorEmail.trim() || null } }, subject: { productId: product.id }, rating: { overall: rating } };
    } else if (section === "moderation") operations = { content: { moderation: { status, moderationNote: moderationNote.trim() || null } } };
    else if (section === "trust") operations = { verification: { status: verification } };
    else operations = { media: media.map((file, sortIndex) => { const current = review.media.find((item) => item.file.id === file.id); return { fileId: file.id, sortIndex, caption: current?.caption ?? null, moderation: current ? { status: current.status, moderationNote: current.moderationNote ?? null } : undefined }; }) };
    const result = await mutation.updateReview(review.id, review.revision, operations); if (!result.review || result.userErrors.length) return setError(result.userErrors.map((item) => item.message).join(" ") || "Unable to update review");
    await value.onSaved?.(); setDirty(false); message.success(`${sectionTitle[section]} updated`); forcePop();
  };
  if (query.loading && !review) return <ModalLayout name="review-edit" headerProps={{ title: sectionTitle[section], onClose: pop, submitButtonProps: null }}><Skeleton active /></ModalLayout>;
  return <ModalLayout name="review-edit" header={<ModalHeader name="review-edit" title={sectionTitle[section]} onClose={pop} submitButtonProps={{ loading: mutation.loading, disabled: !dirty || !review, onClick: save }} />}>
    {query.error || mutation.error ? <Alert type="error" showIcon message={(query.error ?? mutation.error)?.message} /> : null}{error ? <Alert type="error" showIcon message={error} /> : null}
    {section === "content" ? <><Paper><PaperHeader title="Associations & author" /><Flex vertical gap="middle"><div><Typography.Text strong>Product *</Typography.Text><Flex gap="small" style={{ marginTop: 8 }}><Input readOnly value={product?.title ?? ""} /><Button icon={<ShoppingOutlined />} onClick={productPicker.openPicker}>Select</Button></Flex></div><div><Typography.Text strong>Customer</Typography.Text><Flex gap="small" style={{ marginTop: 8 }}><Input readOnly value={customer?.title ?? "Guest or staff author"} /><Button icon={<UserOutlined />} onClick={customerPicker.openPicker}>Select</Button></Flex></div><Flex gap="middle"><Input value={authorName} placeholder="Author name" onChange={(event) => { setAuthorName(event.target.value); change(); }} /><Input type="email" value={authorEmail} placeholder="Author email" onChange={(event) => { setAuthorEmail(event.target.value); change(); }} /></Flex></Flex></Paper><Paper><PaperHeader title="Content" /><Flex vertical gap="middle"><Select value={locale} options={shopLocales.map((item) => ({ value: item.value, label: item.name }))} onChange={(next) => { setLocale(next); change(); }} showSearch /><Rate value={rating} onChange={(next) => { setRating(next); change(); }} /><Input value={title} maxLength={150} showCount placeholder="Title" onChange={(event) => { setTitle(event.target.value); change(); }} /><Input.TextArea value={body} autoSize={{ minRows: 6, maxRows: 12 }} maxLength={5000} showCount onChange={(event) => { setBody(event.target.value); change(); }} /></Flex></Paper></> : null}
    {section === "moderation" ? <Paper><PaperHeader title="Moderation decision" /><Flex vertical gap="middle"><Segmented block value={status} onChange={(next) => { setStatus(next); change(); }} options={[{ value: ReviewContentStatus.Pending, label: "Pending", icon: <ClockCircleOutlined /> }, { value: ReviewContentStatus.Published, label: "Published", icon: <CheckCircleOutlined /> }, { value: ReviewContentStatus.Rejected, label: "Rejected", icon: <CloseCircleOutlined /> }]} /><Input.TextArea value={moderationNote} placeholder="Internal moderation note" rows={5} maxLength={1000} showCount onChange={(event) => { setModerationNote(event.target.value); change(); }} /></Flex></Paper> : null}
    {section === "trust" ? <Paper><PaperHeader title="Purchase verification" /><Select value={verification} options={Object.values(ReviewVerificationStatus).map((item) => ({ value: item, label: item.toLowerCase() }))} onChange={(next) => { setVerification(next); change(); }} style={{ width: "100%" }} /></Paper> : null}
    {section === "media" ? <MediaSection mediaFiles={media} onEdit={editMedia} title="Customer media" editLabel="Edit media" hasFeatured={false} testIdPrefix="review-media" /> : null}
  </ModalLayout>;
}
