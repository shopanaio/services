import { z } from "zod";
import { QuestionAnswerAuthorType, QuestionStatus } from "../../graphql/operation-types";

const answerSchema = z.object({
  id: z.string().optional(),
  body: z.string().trim().min(10, "Answer must contain at least 10 characters").max(5000),
  authorType: z.enum([QuestionAnswerAuthorType.Seller, QuestionAnswerAuthorType.Staff, QuestionAnswerAuthorType.Customer]),
  authorName: z.string().trim().min(1, "Author name is required").max(150),
  isOfficial: z.boolean(),
});

export const questionFormSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  customerId: z.string().min(1, "Customer is required"),
  body: z.string().trim().min(10, "Question must contain at least 10 characters").max(5000),
  status: z.enum([QuestionStatus.Pending, QuestionStatus.Published, QuestionStatus.Rejected]),
  moderationNote: z.string().trim().max(1000, "Moderation note must be at most 1,000 characters"),
  answers: z.array(answerSchema).max(50, "A question can contain at most 50 answers"),
}).superRefine((values, context) => {
  if (values.status === QuestionStatus.Rejected && !values.moderationNote) {
    context.addIssue({ code: "custom", path: ["moderationNote"], message: "Add a reason when rejecting a question" });
  }
});

export type QuestionFormValues = z.infer<typeof questionFormSchema>;
