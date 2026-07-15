import { z } from "zod";
import { ReviewStatus } from "../../graphql/operation-types";
import type { ApiFile } from "@/graphql/types";

export const reviewFormSchema = z
  .object({
    productId: z.string().min(1, "Product is required"),
    customerId: z.string().min(1, "Customer is required"),
    rating: z.number().int().min(1, "Rating is required").max(5),
    title: z.string().trim().max(150, "Title must be at most 150 characters"),
    body: z
      .string()
      .trim()
      .min(20, "Review must contain at least 20 characters")
      .max(5000, "Review must be at most 5,000 characters"),
    isVerifiedPurchase: z.boolean(),
    status: z.enum([
      ReviewStatus.Pending,
      ReviewStatus.Published,
      ReviewStatus.Rejected,
    ]),
    moderationNote: z
      .string()
      .trim()
      .max(1000, "Moderation note must be at most 1,000 characters"),
    media: z
      .array(z.custom<ApiFile>())
      .max(8, "A review can contain at most 8 media files"),
  })
  .superRefine((values, context) => {
    if (values.status === ReviewStatus.Rejected && !values.moderationNote) {
      context.addIssue({
        code: "custom",
        path: ["moderationNote"],
        message: "Add a reason when rejecting a review",
      });
    }
  });

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
