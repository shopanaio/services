import { z } from "zod";
import {
  ReviewContentAuthorType,
  ReviewContentStatus,
} from "@/graphql/types";

const answerSchema = z.object({
  id: z.string().optional(),
  revision: z.number().int().positive().optional(),
  body: z.string().trim().min(10, "Answer must contain at least 10 characters").max(5000),
  locale: z.string().trim().min(2, "Locale is required").max(35),
  authorType: z.enum(ReviewContentAuthorType),
  customerId: z.string(),
  authorName: z.string().trim().min(1, "Author name is required").max(150),
  authorEmail: z.string().trim().email("Enter a valid email").or(z.literal("")),
  isOfficial: z.boolean(),
  isAccepted: z.boolean(),
}).superRefine((values, context) => {
  if (values.authorType === ReviewContentAuthorType.Customer && !values.customerId) {
    context.addIssue({
      code: "custom",
      path: ["customerId"],
      message: "Customer is required for a customer author",
    });
  }
});

export const questionFormSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  authorType: z.enum(ReviewContentAuthorType),
  customerId: z.string(),
  authorDisplayName: z.string().trim().min(1, "Author name is required").max(150),
  authorEmail: z.string().trim().email("Enter a valid email").or(z.literal("")),
  locale: z.string().trim().min(2, "Locale is required").max(35),
  body: z.string().trim().min(10, "Question must contain at least 10 characters").max(5000),
  status: z.enum(ReviewContentStatus),
  moderationNote: z.string().trim().max(1000, "Moderation note must be at most 1,000 characters"),
  answers: z.array(answerSchema).max(50, "A question can contain at most 50 answers"),
}).superRefine((values, context) => {
  if (values.authorType === ReviewContentAuthorType.Customer && !values.customerId) {
    context.addIssue({
      code: "custom",
      path: ["customerId"],
      message: "Customer is required for a customer author",
    });
  }
  if (values.status === ReviewContentStatus.Rejected && !values.moderationNote) {
    context.addIssue({ code: "custom", path: ["moderationNote"], message: "Add a reason when rejecting a question" });
  }
});

export type QuestionFormValues = z.infer<typeof questionFormSchema>;
