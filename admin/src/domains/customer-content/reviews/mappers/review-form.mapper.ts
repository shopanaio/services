import type {
  ApiReview,
  ReviewCreateInput,
  ReviewUpdateInput,
  ReviewUserError,
} from "../graphql/operation-types";
import type { ReviewFormValues } from "../modals/review-modal/schema";

const sharedInput = (values: ReviewFormValues) => ({
  productId: values.productId,
  customerId: values.customerId,
  title: values.title.trim() || null,
  body: values.body.trim(),
  rating: values.rating,
  isVerifiedPurchase: values.isVerifiedPurchase,
  status: values.status,
  moderationNote: values.moderationNote.trim() || null,
  mediaFileIds: values.media.map((file) => file.id),
});

export function buildReviewCreateInput(values: ReviewFormValues): ReviewCreateInput {
  return {
    clientMutationId: crypto.randomUUID(),
    ...sharedInput(values),
  };
}

export function buildReviewUpdateInput(
  values: ReviewFormValues,
  review: ApiReview,
): ReviewUpdateInput {
  return {
    id: review.id,
    expectedVersion: review.version,
    ...sharedInput(values),
  };
}

const formFields = new Set<keyof ReviewFormValues>([
  "productId",
  "customerId",
  "rating",
  "title",
  "body",
  "isVerifiedPurchase",
  "status",
  "moderationNote",
  "media",
]);

export function mapReviewUserErrors(errors: ReviewUserError[]) {
  return errors.map((error) => ({
    field: error.field === "mediaFileIds"
      ? "media" as const
      : error.field && formFields.has(error.field as keyof ReviewFormValues)
        ? (error.field as keyof ReviewFormValues)
        : null,
    message: error.message,
  }));
}
