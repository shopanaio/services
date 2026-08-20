import { z } from "zod";
import {
  ReviewContentAuthorType,
  ReviewContentStatus,
  ReviewVerificationStatus,
  type ApiFile,
} from "@/graphql/types";

export const reviewFormSchema = z
  .object({
    productId: z.string().min(1, "Product is required"),
    authorType: z.enum(ReviewContentAuthorType),
    customerId: z.string(),
    authorDisplayName: z.string().trim().min(1, "Author name is required").max(150),
    authorEmail: z.string().trim().email("Enter a valid email").or(z.literal("")),
    locale: z.string().trim().min(2, "Locale is required").max(35),
    rating: z.number().int().min(1, "Rating is required").max(5),
    title: z.string().trim().max(150, "Title must be at most 150 characters"),
    body: z
      .string()
      .trim()
      .min(20, "Review must contain at least 20 characters")
      .max(5000, "Review must be at most 5,000 characters"),
    verificationStatus: z.enum(ReviewVerificationStatus),
    status: z.enum(ReviewContentStatus),
    moderationNote: z.string().trim().max(1000, "Moderation note must be at most 1,000 characters"),
    media: z.array(z.custom<ApiFile>()).max(8, "A review can contain at most 8 media files"),
  })
  .superRefine((values, context) => {
    if (values.authorType === ReviewContentAuthorType.Customer && !values.customerId) {
      context.addIssue({
        code: "custom",
        path: ["customerId"],
        message: "Customer is required for a customer author",
      });
    }
    if (values.status === ReviewContentStatus.Rejected && !values.moderationNote) {
      context.addIssue({
        code: "custom",
        path: ["moderationNote"],
        message: "Add a reason when rejecting a review",
      });
    }
  });

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;

export const reviewContentSectionSchema = z.object({
  locale: z.string().trim().min(2, "Locale is required").max(35),
  title: z.string().trim().max(150, "Title must be at most 150 characters"),
  body: z
    .string()
    .trim()
    .min(20, "Review must contain at least 20 characters")
    .max(5000, "Review must be at most 5,000 characters"),
});

export const reviewReviewerSectionSchema = z
  .object({
    authorType: z.enum(ReviewContentAuthorType),
    customerId: z.string(),
    displayName: z.string().trim().min(1, "Display name is required").max(150),
    email: z.string().trim().email("Enter a valid email").or(z.literal("")),
  })
  .superRefine((values, context) => {
    if (values.authorType === ReviewContentAuthorType.Customer && !values.customerId) {
      context.addIssue({
        code: "custom",
        path: ["customerId"],
        message: "Customer is required for a customer author",
      });
    }
  });

export const reviewSubjectSectionSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string(),
  orderId: z.string(),
  orderLineId: z.string(),
});

export const reviewRatingsSectionSchema = z.object({
  overall: z.number().int().min(1).max(5),
  criteria: z.array(
    z.object({ criterionId: z.string(), title: z.string(), value: z.number().int().min(1).max(5) }),
  ),
});

export const reviewModerationSectionSchema = z
  .object({
    status: z.enum(ReviewContentStatus),
    moderationNote: z.string().trim().max(1000, "Moderation note must be at most 1,000 characters"),
  })
  .superRefine((values, context) => {
    if (values.status === ReviewContentStatus.Rejected && !values.moderationNote) {
      context.addIssue({
        code: "custom",
        path: ["moderationNote"],
        message: "Add a reason when rejecting a review",
      });
    }
  });

export const reviewVerificationSectionSchema = z
  .object({
    status: z.enum(ReviewVerificationStatus),
    method: z.string().trim().max(64),
    verifiedAt: z.string(),
  })
  .superRefine((values, context) => {
    if (values.status !== ReviewVerificationStatus.Unverified && !values.method) {
      context.addIssue({
        code: "custom",
        path: ["method"],
        message: "Verification method is required",
      });
    }
    if (values.status !== ReviewVerificationStatus.Unverified && !values.verifiedAt) {
      context.addIssue({
        code: "custom",
        path: ["verifiedAt"],
        message: "Verification date is required",
      });
    }
  });

export const reviewIncentiveSectionSchema = z
  .object({
    isIncentivized: z.boolean(),
    disclosure: z.string().trim().max(500, "Disclosure must be at most 500 characters"),
  })
  .superRefine((values, context) => {
    if (values.isIncentivized && !values.disclosure) {
      context.addIssue({
        code: "custom",
        path: ["disclosure"],
        message: "Public disclosure is required",
      });
    }
  });

export const reviewMediaItemSchema = z
  .object({
    caption: z.string().trim().max(500, "Caption must be at most 500 characters"),
    status: z.enum(ReviewContentStatus),
    moderationNote: z.string().trim().max(1000, "Moderation note must be at most 1,000 characters"),
  })
  .superRefine((values, context) => {
    if (values.status === ReviewContentStatus.Rejected && !values.moderationNote) {
      context.addIssue({
        code: "custom",
        path: ["moderationNote"],
        message: "Moderation note is required when media is rejected",
      });
    }
  });

export type ReviewContentSectionValues = z.infer<typeof reviewContentSectionSchema>;
export type ReviewReviewerSectionValues = z.infer<typeof reviewReviewerSectionSchema>;
export type ReviewSubjectSectionValues = z.infer<typeof reviewSubjectSectionSchema>;
export type ReviewRatingsSectionValues = z.infer<typeof reviewRatingsSectionSchema>;
export type ReviewModerationSectionValues = z.infer<typeof reviewModerationSectionSchema>;
export type ReviewVerificationSectionValues = z.infer<typeof reviewVerificationSectionSchema>;
export type ReviewIncentiveSectionValues = z.infer<typeof reviewIncentiveSectionSchema>;
export type ReviewMediaItemValues = z.infer<typeof reviewMediaItemSchema>;
