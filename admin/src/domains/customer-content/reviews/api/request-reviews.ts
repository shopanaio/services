import {
  type ApiReview,
  type ReviewConnection,
  type ReviewOrderByInput,
  ReviewOrderField,
  type ReviewsQueryData,
  type ReviewsQueryVariables,
  ReviewReportReason,
  ReviewStatus,
  type ReviewWhereInput,
} from "../graphql/operation-types";
import { FileProvider, type ApiFile } from "@/graphql/types";

const products: ApiReview["product"][] = [
  { id: "product-running-shoes", title: "CloudRun Pro Running Shoes" },
  { id: "product-headphones", title: "QuietWave Wireless Headphones" },
  { id: "product-coffee-maker", title: "BrewMaster 12-Cup Coffee Maker" },
  { id: "product-air-fryer", title: "CrispMax Digital Air Fryer" },
  { id: "product-backpack", title: "TrailPack Everyday Backpack" },
  { id: "product-linen-set", title: "Stonewashed Linen Sheet Set" },
];

const customers: ApiReview["customer"][] = [
  { id: "customer-olivia", displayName: "Olivia Martin", email: "olivia.martin@example.com" },
  { id: "customer-noah", displayName: "Noah Williams", email: "noah.williams@example.com" },
  { id: "customer-emma", displayName: "Emma Johnson", email: "emma.johnson@example.com" },
  { id: "customer-liam", displayName: "Liam Brown", email: "liam.brown@example.com" },
  { id: "customer-ava", displayName: "Ava Davis", email: "ava.davis@example.com" },
  { id: "customer-ethan", displayName: "Ethan Wilson", email: "ethan.wilson@example.com" },
];

type ReviewSeed = Pick<
  ApiReview,
  | "title"
  | "body"
  | "rating"
  | "status"
  | "isVerifiedPurchase"
  | "reportedCount"
  | "mediaCount"
  | "createdAt"
> & {
  helpfulCount: number;
  productIndex: number;
  customerIndex: number;
};

const reviewSeeds: ReviewSeed[] = [
  { title: "Comfortable from day one", body: "Great cushioning and a secure fit. I used them for a 10K without any break-in issues.", rating: 5, status: ReviewStatus.Published, isVerifiedPurchase: true, helpfulCount: 42, reportedCount: 0, mediaCount: 2, createdAt: "2026-07-14T09:24:00.000Z", productIndex: 0, customerIndex: 0 },
  { title: "Excellent noise cancellation", body: "The commute is much quieter and the battery easily lasts through the week.", rating: 5, status: ReviewStatus.Published, isVerifiedPurchase: true, helpfulCount: 31, reportedCount: 0, mediaCount: 1, createdAt: "2026-07-13T16:10:00.000Z", productIndex: 1, customerIndex: 1 },
  { title: "Arrived with a cracked carafe", body: "The machine looks good, but the glass carafe was cracked inside the box.", rating: 2, status: ReviewStatus.Pending, isVerifiedPurchase: true, helpfulCount: 3, reportedCount: 1, mediaCount: 3, createdAt: "2026-07-12T12:45:00.000Z", productIndex: 2, customerIndex: 2 },
  { title: "Fast and easy dinners", body: "Controls are simple and frozen vegetables come out crisp with very little oil.", rating: 4, status: ReviewStatus.Published, isVerifiedPurchase: true, helpfulCount: 18, reportedCount: 0, mediaCount: 0, createdAt: "2026-07-11T18:32:00.000Z", productIndex: 3, customerIndex: 3 },
  { title: "Good organization, weak zipper", body: "The compartments are useful, though the front zipper started catching after two weeks.", rating: 3, status: ReviewStatus.Published, isVerifiedPurchase: true, helpfulCount: 12, reportedCount: 0, mediaCount: 1, createdAt: "2026-07-10T07:55:00.000Z", productIndex: 4, customerIndex: 4 },
  { title: "Soft and breathable", body: "The linen softened after the first wash and sleeps cool during warm nights.", rating: 5, status: ReviewStatus.Published, isVerifiedPurchase: true, helpfulCount: 27, reportedCount: 0, mediaCount: 2, createdAt: "2026-07-09T14:20:00.000Z", productIndex: 5, customerIndex: 5 },
  { title: null, body: "Sizing runs small. Consider ordering half a size up if you wear thicker socks.", rating: 3, status: ReviewStatus.Published, isVerifiedPurchase: true, helpfulCount: 21, reportedCount: 0, mediaCount: 0, createdAt: "2026-07-08T11:08:00.000Z", productIndex: 0, customerIndex: 2 },
  { title: "Microphone could be better", body: "Music sounds balanced, but callers say my voice is distant outdoors.", rating: 3, status: ReviewStatus.Pending, isVerifiedPurchase: false, helpfulCount: 6, reportedCount: 2, mediaCount: 0, createdAt: "2026-07-07T20:41:00.000Z", productIndex: 1, customerIndex: 4 },
  { title: "Reliable morning coffee", body: "Brews quickly, keeps coffee hot, and the removable basket is easy to clean.", rating: 4, status: ReviewStatus.Published, isVerifiedPurchase: true, helpfulCount: 15, reportedCount: 0, mediaCount: 0, createdAt: "2026-07-06T06:35:00.000Z", productIndex: 2, customerIndex: 0 },
  { title: "Misleading capacity claim", body: "The usable basket space is smaller than expected and does not fit the portions shown.", rating: 2, status: ReviewStatus.Pending, isVerifiedPurchase: false, helpfulCount: 9, reportedCount: 3, mediaCount: 1, createdAt: "2026-07-05T15:17:00.000Z", productIndex: 3, customerIndex: 1 },
  { title: "Perfect personal-item size", body: "Fits under an airline seat and still holds a laptop, a jacket, and a water bottle.", rating: 5, status: ReviewStatus.Published, isVerifiedPurchase: true, helpfulCount: 36, reportedCount: 0, mediaCount: 2, createdAt: "2026-07-04T10:02:00.000Z", productIndex: 4, customerIndex: 3 },
  { title: "Color differs from photos", body: "The fabric quality is nice, but the sage color is much grayer in person.", rating: 3, status: ReviewStatus.Published, isVerifiedPurchase: true, helpfulCount: 8, reportedCount: 0, mediaCount: 1, createdAt: "2026-07-03T13:49:00.000Z", productIndex: 5, customerIndex: 5 },
  { title: "Sole separated after a month", body: "The right sole started separating near the toe after normal walking use.", rating: 1, status: ReviewStatus.Pending, isVerifiedPurchase: true, helpfulCount: 14, reportedCount: 1, mediaCount: 2, createdAt: "2026-07-02T17:26:00.000Z", productIndex: 0, customerIndex: 5 },
  { title: "Worth it on sale", body: "Comfortable ear cups and strong battery life. Multipoint switching is occasionally slow.", rating: 4, status: ReviewStatus.Published, isVerifiedPurchase: true, helpfulCount: 19, reportedCount: 0, mediaCount: 0, createdAt: "2026-07-01T08:14:00.000Z", productIndex: 1, customerIndex: 3 },
  { title: "Spam promotion", body: "Visit my profile for discount codes and free products every day.", rating: 5, status: ReviewStatus.Rejected, isVerifiedPurchase: false, helpfulCount: 0, reportedCount: 7, mediaCount: 0, createdAt: "2026-06-30T21:05:00.000Z", productIndex: 2, customerIndex: 4 },
  { title: "Easy cleanup", body: "The basket and tray clean up quickly in the dishwasher with no lingering smell.", rating: 4, status: ReviewStatus.Published, isVerifiedPurchase: true, helpfulCount: 11, reportedCount: 0, mediaCount: 0, createdAt: "2026-06-29T12:38:00.000Z", productIndex: 3, customerIndex: 0 },
  { title: "Straps are comfortable", body: "Weight distributes well even with a full laptop and camera load.", rating: 4, status: ReviewStatus.Published, isVerifiedPurchase: true, helpfulCount: 17, reportedCount: 0, mediaCount: 1, createdAt: "2026-06-28T09:51:00.000Z", productIndex: 4, customerIndex: 2 },
  { title: "Pilled after two washes", body: "Washed exactly as directed, but the fitted sheet already has visible pilling.", rating: 2, status: ReviewStatus.Pending, isVerifiedPurchase: true, helpfulCount: 10, reportedCount: 0, mediaCount: 2, createdAt: "2026-06-27T16:43:00.000Z", productIndex: 5, customerIndex: 1 },
  { title: "Not an authentic review", body: "Repeated promotional language unrelated to the product experience.", rating: 5, status: ReviewStatus.Rejected, isVerifiedPurchase: false, helpfulCount: 1, reportedCount: 5, mediaCount: 0, createdAt: "2026-06-26T19:29:00.000Z", productIndex: 0, customerIndex: 4 },
  { title: "Solid value", body: "The sound is clear, controls are intuitive, and the case feels sturdy enough for travel.", rating: 4, status: ReviewStatus.Published, isVerifiedPurchase: true, helpfulCount: 23, reportedCount: 0, mediaCount: 1, createdAt: "2026-06-25T11:12:00.000Z", productIndex: 1, customerIndex: 5 },
];

let mockReviews: ApiReview[] = reviewSeeds.map((seed, index) => ({
  id: `review-${String(index + 1).padStart(2, "0")}`,
  version: 1,
  title: seed.title,
  body: seed.body,
  rating: seed.rating,
  status: seed.status,
  isVerifiedPurchase: seed.isVerifiedPurchase,
  likeCount: seed.helpfulCount,
  dislikeCount: seed.rating <= 2 ? 4 + (index % 5) : index % 4,
  reportedCount: seed.reportedCount,
  reports: createMockReports(seed.reportedCount, index, seed.createdAt),
  mediaCount: seed.mediaCount,
  media: Array.from({ length: seed.mediaCount }, (_, mediaIndex) =>
    createMockReviewFile(index, mediaIndex),
  ),
  moderationNote: seed.status === ReviewStatus.Rejected
    ? "Rejected during content moderation."
    : null,
  moderatedAt: seed.status === ReviewStatus.Pending ? null : seed.createdAt,
  createdAt: seed.createdAt,
  updatedAt: seed.createdAt,
  product: products[seed.productIndex]!,
  customer: customers[seed.customerIndex]!,
}));

function createMockReports(count: number, reviewIndex: number, createdAt: string): ApiReview["reports"] {
  const reasons = [
    ReviewReportReason.Spam,
    ReviewReportReason.Offensive,
    ReviewReportReason.NotRelevant,
    ReviewReportReason.ConflictOfInterest,
    ReviewReportReason.Other,
  ];

  return Array.from({ length: count }, (_, reportIndex) => ({
    id: `review-report-${reviewIndex + 1}-${reportIndex + 1}`,
    reason: reasons[(reviewIndex + reportIndex) % reasons.length]!,
    details: reportIndex % 2 === 0 ? "Customer flagged this review for moderator attention." : null,
    createdAt,
    reporter: customers[(reviewIndex + reportIndex + 1) % customers.length]!,
  }));
}

function createMockReviewFile(reviewIndex: number, mediaIndex: number): ApiFile {
  const now = reviewSeeds[reviewIndex]?.createdAt ?? new Date().toISOString();
  return {
    id: `review-media-${reviewIndex + 1}-${mediaIndex + 1}`,
    url: "/assets/shop-cart.png",
    originalName: `customer-photo-${mediaIndex + 1}.png`,
    altText: "Customer review photo",
    mimeType: "image/png",
    ext: "png",
    sizeBytes: 248000,
    provider: FileProvider.Local,
    deletionState: "ACTIVE",
    isProcessed: true,
    createdAt: now,
    updatedAt: now,
    usage: { totalCount: 1, fileActive: true, byEntity: [] },
  };
}

const getReviewField = (review: ApiReview, field: string): unknown => {
  if (field === "hasMedia") return review.mediaCount > 0;
  if (field === "productId") return review.product.id;
  return review[field as keyof ApiReview];
};

function matchesCondition(value: unknown, condition: Record<string, unknown>): boolean {
  return Object.entries(condition).every(([operator, expected]) => {
    if (operator === "_containsi") {
      return String(value ?? "").toLowerCase().includes(String(expected).toLowerCase());
    }
    if (operator === "_in") return Array.isArray(expected) && expected.includes(value);
    if (operator === "_eq" || operator === "_is") return value === expected;
    if (operator === "_neq" || operator === "_isNot") return value !== expected;
    if (operator === "_gte") {
      return typeof value === "number" && typeof expected === "number"
        ? value >= expected
        : String(value) >= String(expected);
    }
    if (operator === "_lte") {
      return typeof value === "number" && typeof expected === "number"
        ? value <= expected
        : String(value) <= String(expected);
    }
    if (operator === "_gt") return Number(value) > Number(expected);
    if (operator === "_lt") return Number(value) < Number(expected);
    return true;
  });
}

function matchesWhere(review: ApiReview, where?: ReviewWhereInput | null): boolean {
  if (!where) return true;
  if (where._and && !where._and.every((condition) => matchesWhere(review, condition))) return false;
  if (where._or && !where._or.some((condition) => matchesWhere(review, condition))) return false;

  return Object.entries(where).every(([field, condition]) => {
    if (field === "_and" || field === "_or" || !condition) return true;
    return matchesCondition(getReviewField(review, field), condition as Record<string, unknown>);
  });
}

const orderFieldAccessors: Record<ReviewOrderField, (review: ApiReview) => string | number | boolean> = {
  [ReviewOrderField.CreatedAt]: (review) => review.createdAt,
  [ReviewOrderField.LikeCount]: (review) => review.likeCount,
  [ReviewOrderField.DislikeCount]: (review) => review.dislikeCount,
  [ReviewOrderField.IsVerifiedPurchase]: (review) => review.isVerifiedPurchase,
  [ReviewOrderField.Rating]: (review) => review.rating,
  [ReviewOrderField.ReportedCount]: (review) => review.reportedCount,
  [ReviewOrderField.Status]: (review) => review.status,
  [ReviewOrderField.UpdatedAt]: (review) => review.updatedAt,
};

function sortReviews(reviews: ApiReview[], orderBy?: ReviewOrderByInput[] | null): ApiReview[] {
  const sort = orderBy?.length
    ? orderBy
    : [{ field: ReviewOrderField.CreatedAt, direction: "DESC" as const }];

  return [...reviews].sort((left, right) => {
    for (const item of sort) {
      const leftValue = orderFieldAccessors[item.field](left);
      const rightValue = orderFieldAccessors[item.field](right);
      const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
      if (comparison !== 0) return item.direction === "ASC" ? comparison : -comparison;
    }
    return left.id.localeCompare(right.id);
  });
}

const cursorForIndex = (index: number) => `review-cursor:${index}`;

function indexFromCursor(cursor?: string | null): number | null {
  if (!cursor) return null;
  const match = /^review-cursor:(\d+)$/.exec(cursor);
  return match ? Number(match[1]) : null;
}

function toConnection(reviews: ApiReview[], variables: ReviewsQueryVariables): ReviewConnection {
  const afterIndex = indexFromCursor(variables.after);
  const beforeIndex = indexFromCursor(variables.before);
  const endExclusive = beforeIndex ?? reviews.length;
  const start = variables.last
    ? Math.max(0, endExclusive - variables.last)
    : Math.min(reviews.length, (afterIndex ?? -1) + 1);
  const end = variables.last
    ? endExclusive
    : Math.min(reviews.length, start + (variables.first ?? 20));
  const page = reviews.slice(start, end);
  const edges = page.map((node, index) => ({
    cursor: cursorForIndex(start + index),
    node,
  }));

  return {
    edges,
    totalCount: reviews.length,
    pageInfo: {
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges.at(-1)?.cursor ?? null,
      hasPreviousPage: start > 0,
      hasNextPage: end < reviews.length,
    },
  };
}

/** Mock transport boundary; replace this function with Apollo when review schema lands. */
export async function requestReviews(variables: ReviewsQueryVariables): Promise<ReviewsQueryData> {
  const filtered = mockReviews.filter((review) => matchesWhere(review, variables.where));
  const ordered = sortReviews(filtered, variables.orderBy);

  return Promise.resolve({
    reviewQuery: {
      reviews: toConnection(ordered, variables),
    },
  });
}

export async function requestReview(id: string): Promise<ApiReview | null> {
  return Promise.resolve(mockReviews.find((review) => review.id === id) ?? null);
}

export async function requestReviewEditorContext() {
  return Promise.resolve({
    products: [...products],
    customers: [...customers],
  });
}

function validateReviewInput(input: {
  productId: string;
  customerId: string;
  body: string;
  rating: number;
  status: ReviewStatus;
  moderationNote?: string | null;
  mediaFileIds?: string[] | null;
}) {
  const errors = [];
  if (!products.some((product) => product.id === input.productId)) {
    errors.push({ code: "PRODUCT_NOT_FOUND", field: "productId", message: "Select a valid product." });
  }
  if (!customers.some((customer) => customer.id === input.customerId)) {
    errors.push({ code: "CUSTOMER_NOT_FOUND", field: "customerId", message: "Select a valid customer." });
  }
  if (input.body.trim().length < 20) {
    errors.push({ code: "BODY_TOO_SHORT", field: "body", message: "Review must contain at least 20 characters." });
  }
  if (input.rating < 1 || input.rating > 5) {
    errors.push({ code: "INVALID_RATING", field: "rating", message: "Rating must be between 1 and 5." });
  }
  if (input.status === ReviewStatus.Rejected && !input.moderationNote?.trim()) {
    errors.push({ code: "MODERATION_NOTE_REQUIRED", field: "moderationNote", message: "Add a reason when rejecting a review." });
  }
  if ((input.mediaFileIds?.length ?? 0) > 8) {
    errors.push({ code: "TOO_MANY_MEDIA_FILES", field: "mediaFileIds", message: "A review can contain at most 8 media files." });
  }
  return errors;
}

function validateReviewMedia(media: ApiFile[]) {
  const allowedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "video/mp4",
    "video/webm",
  ]);
  const errors = [];
  if (media.length > 8) {
    errors.push({ code: "TOO_MANY_MEDIA_FILES", field: "mediaFileIds", message: "A review can contain at most 8 media files." });
  }
  if (media.some((file) => file.mimeType && !allowedMimeTypes.has(file.mimeType))) {
    errors.push({ code: "UNSUPPORTED_MEDIA_TYPE", field: "mediaFileIds", message: "Use JPEG, PNG, WebP, AVIF, MP4, or WebM files." });
  }
  if (media.some((file) => Number(file.sizeBytes) > 50 * 1024 * 1024)) {
    errors.push({ code: "MEDIA_FILE_TOO_LARGE", field: "mediaFileIds", message: "Each media file must be 50 MB or smaller." });
  }
  return errors;
}

export async function requestCreateReview(
  input: import("../graphql/operation-types").ReviewCreateInput,
  media: ApiFile[] = [],
): Promise<import("../graphql/operation-types").ReviewMutationPayload> {
  const userErrors = [...validateReviewInput(input), ...validateReviewMedia(media)];
  if (userErrors.length > 0) return Promise.resolve({ review: null, userErrors });

  const now = new Date().toISOString();
  const review: ApiReview = {
    id: `review-${crypto.randomUUID()}`,
    version: 1,
    title: input.title?.trim() || null,
    body: input.body.trim(),
    rating: input.rating,
    status: input.status,
    isVerifiedPurchase: input.isVerifiedPurchase,
    likeCount: 0,
    dislikeCount: 0,
    reportedCount: 0,
    reports: [],
    mediaCount: media.length,
    media,
    moderationNote: input.moderationNote?.trim() || null,
    moderatedAt: input.status === ReviewStatus.Pending ? null : now,
    createdAt: now,
    updatedAt: now,
    product: products.find((product) => product.id === input.productId)!,
    customer: customers.find((customer) => customer.id === input.customerId)!,
  };
  mockReviews = [review, ...mockReviews];
  return Promise.resolve({ review, userErrors: [] });
}

export async function requestUpdateReview(
  input: import("../graphql/operation-types").ReviewUpdateInput,
  media: ApiFile[] = [],
): Promise<import("../graphql/operation-types").ReviewMutationPayload> {
  const currentIndex = mockReviews.findIndex((review) => review.id === input.id);
  const current = mockReviews[currentIndex];
  if (!current) {
    return Promise.resolve({
      review: null,
      userErrors: [{ code: "REVIEW_NOT_FOUND", field: "id", message: "Review no longer exists." }],
    });
  }
  if (current.version !== input.expectedVersion) {
    return Promise.resolve({
      review: null,
      userErrors: [{ code: "VERSION_CONFLICT", field: null, message: "This review was changed by another user. Reload and try again." }],
    });
  }

  const userErrors = [...validateReviewInput(input), ...validateReviewMedia(media)];
  if (userErrors.length > 0) return Promise.resolve({ review: null, userErrors });

  const now = new Date().toISOString();
  const review: ApiReview = {
    ...current,
    version: current.version + 1,
    title: input.title?.trim() || null,
    body: input.body.trim(),
    rating: input.rating,
    status: input.status,
    isVerifiedPurchase: input.isVerifiedPurchase,
    moderationNote: input.moderationNote?.trim() || null,
    mediaCount: media.length,
    media,
    moderatedAt: input.status === ReviewStatus.Pending ? null : now,
    updatedAt: now,
    product: products.find((product) => product.id === input.productId)!,
    customer: customers.find((customer) => customer.id === input.customerId)!,
  };
  mockReviews[currentIndex] = review;
  return Promise.resolve({ review, userErrors: [] });
}
