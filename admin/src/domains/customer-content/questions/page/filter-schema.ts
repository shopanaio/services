import {
  FilterType,
  dateOperators,
  enumOperators,
  numberOperators,
  relationOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { ProductQuestionAnswerState, ReviewContentStatus } from "@/graphql/types";

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
      { label: "Pending", value: ReviewContentStatus.Pending },
      { label: "Published", value: ReviewContentStatus.Published },
      { label: "Rejected", value: ReviewContentStatus.Rejected },
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
      { label: "Unanswered", value: ProductQuestionAnswerState.Unanswered },
      { label: "Answered", value: ProductQuestionAnswerState.Answered },
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
    key: "reportCount",
    label: "Abuse reports",
    description: "Filter by the number of customer abuse reports",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "reportCount",
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
