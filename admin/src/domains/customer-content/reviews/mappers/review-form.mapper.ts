import type { FieldPath } from "react-hook-form";
import type {
  ApiGenericUserError,
  ApiReview,
  ApiReviewContentAuthorCreateInput,
  ApiReviewContentAuthorUpdateInput,
  ApiReviewCreateInput,
  ApiReviewMediaSyncItemInput,
  ApiReviewUpdateInput,
} from "@/graphql/types";
import { ReviewContentAuthorType } from "@/graphql/types";
import type { ReviewFormValues } from "../modals/review-modal/schema";

function buildAuthor(values: ReviewFormValues): ApiReviewContentAuthorCreateInput {
  return {
    type: values.authorType,
    customerId: values.authorType === ReviewContentAuthorType.Customer
      ? values.customerId || null
      : null,
    displayName: values.authorDisplayName.trim(),
    email: values.authorEmail.trim() || null,
  };
}

function buildAuthorUpdate(values: ReviewFormValues): ApiReviewContentAuthorUpdateInput {
  return buildAuthor(values);
}

function buildCreateMedia(values: ReviewFormValues): ApiReviewMediaSyncItemInput[] {
  return values.media.map((file, sortIndex) => ({ fileId: file.id, sortIndex }));
}

function buildUpdateMedia(
  values: ReviewFormValues,
  review: ApiReview,
): ApiReviewMediaSyncItemInput[] {
  return values.media.map((file, sortIndex) => {
    const current = review.media.find((item) => item.file.id === file.id);
    return {
      fileId: file.id,
      sortIndex,
      caption: current?.caption ?? null,
      moderation: current
        ? {
            status: current.status,
            moderationNote: current.moderationNote ?? null,
          }
        : undefined,
    };
  });
}

export function buildReviewCreateInput(values: ReviewFormValues): ApiReviewCreateInput {
  return {
    content: {
      title: values.title.trim() || null,
      body: values.body.trim(),
      locale: values.locale.trim(),
      author: buildAuthor(values),
      source: { channel: "ADMIN" },
      status: values.status,
      moderationNote: values.moderationNote.trim() || null,
    },
    productId: values.productId,
    rating: values.rating,
    verification: { status: values.verificationStatus },
    media: buildCreateMedia(values),
  };
}

export function buildReviewUpdateInput(
  values: ReviewFormValues,
  review: ApiReview,
): ApiReviewUpdateInput {
  return {
    content: {
      text: {
        title: values.title.trim() || null,
        body: values.body.trim(),
        locale: values.locale.trim(),
      },
      author: buildAuthorUpdate(values),
      moderation: {
        status: values.status,
        moderationNote: values.moderationNote.trim() || null,
      },
    },
    subject: { productId: values.productId },
    rating: { overall: values.rating },
    verification: { status: values.verificationStatus },
    media: buildUpdateMedia(values, review),
  };
}

const fieldMap: Record<string, FieldPath<ReviewFormValues>> = {
  "content.author.customerId": "customerId",
  "content.author.type": "authorType",
  "content.author.displayName": "authorDisplayName",
  "content.author.email": "authorEmail",
  "content.text.title": "title",
  "content.text.body": "body",
  "content.text.locale": "locale",
  "content.moderation.status": "status",
  "content.moderation.moderationNote": "moderationNote",
  "content.title": "title",
  "content.body": "body",
  "content.locale": "locale",
  "content.status": "status",
  "content.moderationNote": "moderationNote",
  productId: "productId",
  "subject.productId": "productId",
  rating: "rating",
  "rating.overall": "rating",
  verification: "verificationStatus",
  "verification.status": "verificationStatus",
  media: "media",
};

export function mapReviewUserErrors(errors: ApiGenericUserError[]) {
  return errors.map((error) => {
    const path = error.field?.join(".") ?? "";
    const field = Object.entries(fieldMap).find(
      ([apiPath]) => path === apiPath || path.endsWith(`.${apiPath}`),
    )?.[1] ?? null;
    return { field, message: error.message };
  });
}
