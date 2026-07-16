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
    moderationNote: z
      .string()
      .trim()
      .max(1000, "Moderation note must be at most 1,000 characters"),
    media: z
      .array(z.custom<ApiFile>())
      .max(8, "A review can contain at most 8 media files"),
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
