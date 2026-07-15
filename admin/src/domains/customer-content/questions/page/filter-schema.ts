import {
  FilterType,
  dateOperators,
  enumOperators,
  numberOperators,
  relationOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { QuestionAnswerState, QuestionStatus } from "../graphql/operation-types";

/** Required operational filters for question answering and moderation queues. */
export const filterSchema: IFilterSchema[] = [
  {
    key: "status",
    label: "Status",
    description: "Filter by moderation status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "status",
    options: [
      { label: "Pending", value: QuestionStatus.Pending },
      { label: "Published", value: QuestionStatus.Published },
      { label: "Rejected", value: QuestionStatus.Rejected },
    ],
  },
  {
    key: "answerState",
    label: "Answer status",
    description: "Find questions that still need an answer",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "answerState",
    options: [
      { label: "Unanswered", value: QuestionAnswerState.Unanswered },
      { label: "Answered", value: QuestionAnswerState.Answered },
    ],
  },
  {
    key: "product",
    label: "Product",
    description: "Filter questions for selected products",
    type: FilterType.Relation,
    operators: relationOperators,
    payloadKey: "productId",
    entity: "product",
  },
  {
    key: "reportedCount",
    label: "Abuse reports",
    description: "Filter by the number of customer abuse reports",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "reportedCount",
  },
  {
    key: "createdAt",
    label: "Submitted date",
    description: "Filter by question submission date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "createdAt",
  },
];
