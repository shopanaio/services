import type { FieldPath } from "react-hook-form";
import type {
  ApiGenericUserError,
  ApiProductQuestion,
  ApiProductQuestionAnswerCreateOperationInput,
  ApiProductQuestionAnswerDeleteOperationInput,
  ApiProductQuestionAnswerUpdateOperationInput,
  ApiProductQuestionCreateInput,
  ApiProductQuestionUpdateInput,
  ApiReviewContentAuthorCreateInput,
  ApiReviewContentAuthorUpdateInput,
} from "@/graphql/types";
import { ReviewContentAuthorType } from "@/graphql/types";
import type { QuestionFormValues } from "../modals/question-modal/schema";

type AuthorValues = Pick<
  QuestionFormValues,
  "authorType" | "customerId" | "authorDisplayName" | "authorEmail"
>;

function buildAuthor(values: AuthorValues): ApiReviewContentAuthorCreateInput {
  return {
    type: values.authorType,
    customerId:
      values.authorType === ReviewContentAuthorType.Customer ? values.customerId || null : null,
    displayName: values.authorDisplayName.trim(),
    email: values.authorEmail.trim() || null,
  };
}

function buildAuthorUpdate(values: AuthorValues): ApiReviewContentAuthorUpdateInput {
  return buildAuthor(values);
}

function buildAnswerAuthor(
  answer: QuestionFormValues["answers"][number],
): ApiReviewContentAuthorCreateInput {
  return {
    type: answer.authorType,
    customerId:
      answer.authorType === ReviewContentAuthorType.Customer ? answer.customerId || null : null,
    displayName: answer.authorName.trim(),
    email: answer.authorEmail.trim() || null,
  };
}

export function buildQuestionCreateInput(
  values: QuestionFormValues,
): ApiProductQuestionCreateInput {
  return {
    productId: values.productId,
    content: {
      body: values.body.trim(),
      locale: values.locale.trim(),
      author: buildAuthor(values),
      source: { channel: "ADMIN" },
      status: values.status,
      moderationNote: values.moderationNote.trim() || null,
    },
  };
}

export function buildQuestionCreateAnswers(
  values: QuestionFormValues,
): ApiProductQuestionAnswerCreateOperationInput[] {
  return values.answers.map((answer, sortIndex) => ({
    content: {
      body: answer.body.trim(),
      locale: answer.locale.trim(),
      author: buildAnswerAuthor(answer),
      source: { channel: "ADMIN" },
      status: values.status,
    },
    isOfficial: answer.isOfficial,
    isAccepted: answer.isAccepted,
    sortIndex,
  }));
}

export function buildQuestionUpdateInput(
  values: QuestionFormValues,
): ApiProductQuestionUpdateInput {
  return {
    content: {
      text: { body: values.body.trim(), locale: values.locale.trim() },
      author: buildAuthorUpdate(values),
      moderation: {
        status: values.status,
        moderationNote: values.moderationNote.trim() || null,
      },
    },
    subject: { productId: values.productId },
  };
}

export interface QuestionAnswerMutationPlan {
  create: ApiProductQuestionAnswerCreateOperationInput[];
  update: ApiProductQuestionAnswerUpdateOperationInput[];
  delete: ApiProductQuestionAnswerDeleteOperationInput[];
}

export function buildQuestionAnswerMutationPlan(
  values: QuestionFormValues,
  question: ApiProductQuestion,
): QuestionAnswerMutationPlan {
  const currentAnswers = question.answers.edges.map((edge) => edge.node);
  const submittedIds = new Set(values.answers.flatMap((answer) => (answer.id ? [answer.id] : [])));
  const create: ApiProductQuestionAnswerCreateOperationInput[] = [];
  const update: QuestionAnswerMutationPlan["update"] = [];

  values.answers.forEach((answer, sortIndex) => {
    if (!answer.id) {
      create.push({
        content: {
          body: answer.body.trim(),
          locale: answer.locale.trim(),
          author: buildAnswerAuthor(answer),
          source: { channel: "ADMIN" },
          status: values.status,
        },
        isOfficial: answer.isOfficial,
        isAccepted: answer.isAccepted,
        sortIndex,
      });
      return;
    }

    const current = currentAnswers.find((item) => item.id === answer.id);
    if (!current) return;
    update.push({
      answerId: current.id,

      operations: {
        content: {
          text: { body: answer.body.trim(), locale: answer.locale.trim() },
          author: buildAnswerAuthor(answer),
        },
        properties: {
          isOfficial: answer.isOfficial,
          isAccepted: answer.isAccepted,
          sortIndex,
        },
      },
    });
  });

  return {
    create,
    update,
    delete: currentAnswers
      .filter((answer) => !submittedIds.has(answer.id))
      .map((answer) => ({
        answerId: answer.id,
      })),
  };
}

const fieldMap: Record<string, FieldPath<QuestionFormValues>> = {
  "content.author.customerId": "customerId",
  "content.author.type": "authorType",
  "content.author.displayName": "authorDisplayName",
  "content.author.email": "authorEmail",
  "content.text.body": "body",
  "content.text.locale": "locale",
  "content.moderation.status": "status",
  "content.moderation.moderationNote": "moderationNote",
  "content.body": "body",
  "content.locale": "locale",
  "content.status": "status",
  "content.moderationNote": "moderationNote",
  productId: "productId",
  "subject.productId": "productId",
};

export function mapQuestionUserErrors(errors: ApiGenericUserError[]) {
  return errors.map((error) => {
    const path = error.field?.join(".") ?? "";
    const field =
      Object.entries(fieldMap).find(
        ([apiPath]) => path === apiPath || path.endsWith(`.${apiPath}`),
      )?.[1] ?? null;
    return { field, message: error.message };
  });
}
