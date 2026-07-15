import type { ApiQuestion, QuestionCreateInput, QuestionUpdateInput, QuestionUserError } from "../graphql/operation-types";
import type { QuestionFormValues } from "../modals/question-modal/schema";

const sharedInput = (values: QuestionFormValues) => ({
  productId: values.productId,
  customerId: values.customerId,
  body: values.body.trim(),
  status: values.status,
  moderationNote: values.moderationNote.trim() || null,
  answers: values.answers.map((answer) => ({
    id: answer.id ?? null,
    body: answer.body.trim(),
    authorType: answer.authorType,
    authorName: answer.authorName.trim(),
    isOfficial: answer.isOfficial,
  })),
});

export function buildQuestionCreateInput(values: QuestionFormValues): QuestionCreateInput {
  return { clientMutationId: crypto.randomUUID(), ...sharedInput(values) };
}

export function buildQuestionUpdateInput(values: QuestionFormValues, question: ApiQuestion): QuestionUpdateInput {
  return { id: question.id, expectedVersion: question.version, ...sharedInput(values) };
}

const formFields = new Set<keyof QuestionFormValues>(["productId", "customerId", "body", "status", "moderationNote", "answers"]);
export function mapQuestionUserErrors(errors: QuestionUserError[]) {
  return errors.map((error) => ({
    field: error.field && formFields.has(error.field as keyof QuestionFormValues)
        ? error.field as keyof QuestionFormValues
        : null,
    message: error.message,
  }));
}
