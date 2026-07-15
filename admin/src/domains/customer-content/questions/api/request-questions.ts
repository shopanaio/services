import {
  type ApiQuestion,
  type QuestionConnection,
  type QuestionCreateInput,
  type QuestionMutationPayload,
  type QuestionOrderByInput,
  QuestionAnswerAuthorType,
  QuestionAnswerState,
  QuestionOrderField,
  QuestionReportReason,
  QuestionStatus,
  type QuestionsQueryData,
  type QuestionsQueryVariables,
  type QuestionUpdateInput,
  type QuestionWhereInput,
} from "../graphql/operation-types";

const products: ApiQuestion["product"][] = [
  { id: "product-running-shoes", title: "CloudRun Pro Running Shoes" },
  { id: "product-headphones", title: "QuietWave Wireless Headphones" },
  { id: "product-coffee-maker", title: "BrewMaster 12-Cup Coffee Maker" },
  { id: "product-air-fryer", title: "CrispMax Digital Air Fryer" },
  { id: "product-backpack", title: "TrailPack Everyday Backpack" },
  { id: "product-linen-set", title: "Stonewashed Linen Sheet Set" },
];

const customers: ApiQuestion["customer"][] = [
  { id: "customer-olivia", displayName: "Olivia Martin", email: "olivia.martin@example.com" },
  { id: "customer-noah", displayName: "Noah Williams", email: "noah.williams@example.com" },
  { id: "customer-emma", displayName: "Emma Johnson", email: "emma.johnson@example.com" },
  { id: "customer-liam", displayName: "Liam Brown", email: "liam.brown@example.com" },
  { id: "customer-ava", displayName: "Ava Davis", email: "ava.davis@example.com" },
  { id: "customer-ethan", displayName: "Ethan Wilson", email: "ethan.wilson@example.com" },
];

const questionBodies = [
  "Do these shoes run true to size for wide feet?",
  "Can the headphones connect to a laptop and phone at the same time?",
  "Is the coffee maker compatible with reusable filters?",
  "What are the internal basket dimensions of the air fryer?",
  "Will the backpack fit a 16-inch laptop in the padded sleeve?",
  "Does the fitted sheet work with a 14-inch deep mattress?",
  "Are replacement insoles available for this model?",
  "Does active noise cancellation work while using the wired connection?",
  "Can the warming plate be configured to stay on longer than two hours?",
  "Are the basket and crisper tray dishwasher safe?",
  "Is the fabric water resistant enough for light rain?",
  "Will the color fade if the linen is washed in warm water?",
  "What is the heel-to-toe drop in millimeters?",
  "Does the microphone mute button work with Microsoft Teams?",
  "Is there a smaller replacement carafe available?",
  "Can this appliance be used safely under low kitchen cabinets?",
  "Does the luggage strap fit over a standard carry-on handle?",
  "Are individual pillowcases available in matching colors?",
  "Does this product include a manufacturer warranty?",
  "When will the navy color be back in stock?",
];

const createdDates = questionBodies.map((_, index) =>
  new Date(Date.UTC(2026, 6, 14 - index, 9 + (index % 8), 15)).toISOString(),
);

function createAnswers(questionIndex: number): ApiQuestion["answers"] {
  if (questionIndex % 3 === 1) return [];
  const createdAt = createdDates[questionIndex]!;
  const count = questionIndex % 5 === 0 ? 2 : 1;
  return Array.from({ length: count }, (_, answerIndex) => ({
    id: `question-answer-${questionIndex + 1}-${answerIndex + 1}`,
    version: 1,
    body: answerIndex === 0
      ? "Yes. This has been confirmed for the current product version. Please check the product specifications for exact measurements."
      : "I purchased this recently and it worked as expected for my setup.",
    authorType: answerIndex === 0 ? QuestionAnswerAuthorType.Staff : QuestionAnswerAuthorType.Customer,
    authorName: answerIndex === 0 ? "Shopana Support" : customers[(questionIndex + 2) % customers.length]!.displayName,
    isOfficial: answerIndex === 0,
    likeCount: 4 + (questionIndex % 13),
    dislikeCount: answerIndex,
    createdAt,
    updatedAt: createdAt,
  }));
}

function createReports(questionIndex: number): ApiQuestion["reports"] {
  const count = questionIndex % 7 === 0 ? 1 + (questionIndex % 2) : 0;
  return Array.from({ length: count }, (_, reportIndex) => ({
    id: `question-report-${questionIndex + 1}-${reportIndex + 1}`,
    reason: questionIndex % 2 === 0 ? QuestionReportReason.Spam : QuestionReportReason.NotRelevant,
    details: "Customer asked a moderator to inspect this question.",
    createdAt: createdDates[questionIndex]!,
    reporter: customers[(questionIndex + reportIndex + 1) % customers.length]!,
  }));
}

let mockQuestions: ApiQuestion[] = questionBodies.map((body, index) => {
  const answers = createAnswers(index);
  const reports = createReports(index);
  const status = index % 9 === 8
    ? QuestionStatus.Rejected
    : index % 4 === 1
      ? QuestionStatus.Pending
      : QuestionStatus.Published;
  return {
    id: `question-${String(index + 1).padStart(2, "0")}`,
    version: 1,
    body,
    status,
    answerState: answers.length ? QuestionAnswerState.Answered : QuestionAnswerState.Unanswered,
    answerCount: answers.length,
    answers,
    likeCount: 3 + ((index * 7) % 29),
    dislikeCount: index % 4,
    reportedCount: reports.length,
    reports,
    moderationNote: status === QuestionStatus.Rejected ? "Rejected during content moderation." : null,
    moderatedAt: status === QuestionStatus.Pending ? null : createdDates[index]!,
    createdAt: createdDates[index]!,
    updatedAt: createdDates[index]!,
    product: products[index % products.length]!,
    customer: customers[index % customers.length]!,
  };
});

const getQuestionField = (question: ApiQuestion, field: string): unknown => {
  if (field === "productId") return question.product.id;
  return question[field as keyof ApiQuestion];
};

function matchesCondition(value: unknown, condition: Record<string, unknown>): boolean {
  return Object.entries(condition).every(([operator, expected]) => {
    if (operator === "_containsi") return String(value ?? "").toLowerCase().includes(String(expected).toLowerCase());
    if (operator === "_in") return Array.isArray(expected) && expected.includes(value);
    if (operator === "_eq" || operator === "_is") return value === expected;
    if (operator === "_neq" || operator === "_isNot") return value !== expected;
    if (operator === "_gte") return typeof value === "number" && typeof expected === "number" ? value >= expected : String(value) >= String(expected);
    if (operator === "_lte") return typeof value === "number" && typeof expected === "number" ? value <= expected : String(value) <= String(expected);
    if (operator === "_gt") return Number(value) > Number(expected);
    if (operator === "_lt") return Number(value) < Number(expected);
    return true;
  });
}

function matchesWhere(question: ApiQuestion, where?: QuestionWhereInput | null): boolean {
  if (!where) return true;
  if (where._and && !where._and.every((item) => matchesWhere(question, item))) return false;
  if (where._or && !where._or.some((item) => matchesWhere(question, item))) return false;
  return Object.entries(where).every(([field, condition]) => {
    if (field === "_and" || field === "_or" || !condition) return true;
    return matchesCondition(getQuestionField(question, field), condition as Record<string, unknown>);
  });
}

const orderAccessors: Record<QuestionOrderField, (question: ApiQuestion) => string | number> = {
  [QuestionOrderField.AnswerCount]: (question) => question.answerCount,
  [QuestionOrderField.CreatedAt]: (question) => question.createdAt,
  [QuestionOrderField.DislikeCount]: (question) => question.dislikeCount,
  [QuestionOrderField.LikeCount]: (question) => question.likeCount,
  [QuestionOrderField.ReportedCount]: (question) => question.reportedCount,
  [QuestionOrderField.Status]: (question) => question.status,
  [QuestionOrderField.UpdatedAt]: (question) => question.updatedAt,
};

function sortQuestions(questions: ApiQuestion[], orderBy?: QuestionOrderByInput[] | null) {
  const sort = orderBy?.length ? orderBy : [{ field: QuestionOrderField.CreatedAt, direction: "DESC" as const }];
  return [...questions].sort((left, right) => {
    for (const item of sort) {
      const a = orderAccessors[item.field](left);
      const b = orderAccessors[item.field](right);
      const comparison = a < b ? -1 : a > b ? 1 : 0;
      if (comparison) return item.direction === "ASC" ? comparison : -comparison;
    }
    return left.id.localeCompare(right.id);
  });
}

const cursorForIndex = (index: number) => `question-cursor:${index}`;
const indexFromCursor = (cursor?: string | null) => {
  const match = cursor ? /^question-cursor:(\d+)$/.exec(cursor) : null;
  return match ? Number(match[1]) : null;
};

function toConnection(questions: ApiQuestion[], variables: QuestionsQueryVariables): QuestionConnection {
  const after = indexFromCursor(variables.after);
  const before = indexFromCursor(variables.before);
  const endExclusive = before ?? questions.length;
  const start = variables.last ? Math.max(0, endExclusive - variables.last) : Math.min(questions.length, (after ?? -1) + 1);
  const end = variables.last ? endExclusive : Math.min(questions.length, start + (variables.first ?? 20));
  const edges = questions.slice(start, end).map((node, index) => ({ cursor: cursorForIndex(start + index), node }));
  return {
    edges,
    totalCount: questions.length,
    pageInfo: {
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges.at(-1)?.cursor ?? null,
      hasPreviousPage: start > 0,
      hasNextPage: end < questions.length,
    },
  };
}

export async function requestQuestions(variables: QuestionsQueryVariables): Promise<QuestionsQueryData> {
  const filtered = mockQuestions.filter((question) => matchesWhere(question, variables.where));
  return Promise.resolve({ reviewQuery: { questions: toConnection(sortQuestions(filtered, variables.orderBy), variables) } });
}

export async function requestQuestion(id: string) {
  return Promise.resolve(mockQuestions.find((question) => question.id === id) ?? null);
}

export async function requestQuestionEditorContext() {
  return Promise.resolve({ products: [...products], customers: [...customers] });
}

function validateInput(input: QuestionCreateInput | QuestionUpdateInput) {
  const errors: { code: string; field?: string; message: string }[] = [];
  if (!products.some((product) => product.id === input.productId)) errors.push({ code: "PRODUCT_NOT_FOUND", field: "productId", message: "Select a valid product." });
  if (!customers.some((customer) => customer.id === input.customerId)) errors.push({ code: "CUSTOMER_NOT_FOUND", field: "customerId", message: "Select a valid customer." });
  if (input.body.trim().length < 10) errors.push({ code: "BODY_TOO_SHORT", field: "body", message: "Question must contain at least 10 characters." });
  if (input.status === QuestionStatus.Rejected && !input.moderationNote?.trim()) errors.push({ code: "MODERATION_NOTE_REQUIRED", field: "moderationNote", message: "Add a reason when rejecting a question." });
  if (input.answers?.some((answer) => answer.body.trim().length < 10)) errors.push({ code: "ANSWER_TOO_SHORT", field: "answers", message: "Each answer must contain at least 10 characters." });
  return errors;
}

function buildAnswers(input: QuestionCreateInput | QuestionUpdateInput, current?: ApiQuestion) {
  const now = new Date().toISOString();
  return (input.answers ?? []).map((answer, index) => {
    const existing = current?.answers.find((item) => item.id === answer.id);
    return {
      id: existing?.id ?? `question-answer-${crypto.randomUUID()}`,
      version: existing ? existing.version + 1 : 1,
      body: answer.body.trim(),
      authorType: answer.authorType,
      authorName: answer.authorName.trim(),
      isOfficial: answer.isOfficial,
      likeCount: existing?.likeCount ?? 0,
      dislikeCount: existing?.dislikeCount ?? 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      sortIndex: index,
    };
  }).map(({ sortIndex: _, ...answer }) => answer);
}

export async function requestCreateQuestion(input: QuestionCreateInput): Promise<QuestionMutationPayload> {
  const userErrors = validateInput(input);
  if (userErrors.length) return { question: null, userErrors };
  const now = new Date().toISOString();
  const answers = buildAnswers(input);
  const question: ApiQuestion = {
    id: `question-${crypto.randomUUID()}`,
    version: 1,
    body: input.body.trim(),
    status: input.status,
    answerState: answers.length ? QuestionAnswerState.Answered : QuestionAnswerState.Unanswered,
    answerCount: answers.length,
    answers,
    likeCount: 0,
    dislikeCount: 0,
    reportedCount: 0,
    reports: [],
    moderationNote: input.moderationNote?.trim() || null,
    moderatedAt: input.status === QuestionStatus.Pending ? null : now,
    createdAt: now,
    updatedAt: now,
    product: products.find((item) => item.id === input.productId)!,
    customer: customers.find((item) => item.id === input.customerId)!,
  };
  mockQuestions = [question, ...mockQuestions];
  return { question, userErrors: [] };
}

export async function requestUpdateQuestion(input: QuestionUpdateInput): Promise<QuestionMutationPayload> {
  const index = mockQuestions.findIndex((question) => question.id === input.id);
  const current = mockQuestions[index];
  if (!current) return { question: null, userErrors: [{ code: "QUESTION_NOT_FOUND", field: "id", message: "Question no longer exists." }] };
  if (current.version !== input.expectedVersion) return { question: null, userErrors: [{ code: "VERSION_CONFLICT", message: "This question was changed by another user. Reload and try again." }] };
  const userErrors = validateInput(input);
  if (userErrors.length) return { question: null, userErrors };
  const now = new Date().toISOString();
  const answers = buildAnswers(input, current);
  const question: ApiQuestion = {
    ...current,
    version: current.version + 1,
    body: input.body.trim(),
    status: input.status,
    answerState: answers.length ? QuestionAnswerState.Answered : QuestionAnswerState.Unanswered,
    answerCount: answers.length,
    answers,
    moderationNote: input.moderationNote?.trim() || null,
    moderatedAt: input.status === QuestionStatus.Pending ? null : now,
    updatedAt: now,
    product: products.find((item) => item.id === input.productId)!,
    customer: customers.find((item) => item.id === input.customerId)!,
  };
  mockQuestions[index] = question;
  return { question, userErrors: [] };
}
