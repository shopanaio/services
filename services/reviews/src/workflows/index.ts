import {
  ContentExternalReferenceCreateWorkflow,
  ModerationCaseCreateWorkflow,
  ProductQuestionCreateWorkflow,
  RatingCriterionCreateWorkflow,
  ReviewCreateWorkflow,
  ReviewRequestCreateWorkflow,
} from "./CreateWorkflows.js";
import {
  ContentExternalReferenceDeleteWorkflow,
  ProductQuestionDeleteWorkflow,
  RatingCriterionDeleteWorkflow,
  ReviewDeleteWorkflow,
} from "./DeleteWorkflows.js";

export const workflows = [
  RatingCriterionCreateWorkflow,
  ReviewCreateWorkflow,
  ProductQuestionCreateWorkflow,
  ReviewRequestCreateWorkflow,
  ModerationCaseCreateWorkflow,
  ContentExternalReferenceCreateWorkflow,
  RatingCriterionDeleteWorkflow,
  ReviewDeleteWorkflow,
  ProductQuestionDeleteWorkflow,
  ContentExternalReferenceDeleteWorkflow,
];

export * from "./CreateWorkflows.js";
export * from "./DeleteWorkflows.js";
