import {
  ContentExternalReferenceCreateWorkflow,
  ModerationCaseCreateWorkflow,
  ProductQuestionCreateWorkflow,
  RatingCriterionCreateWorkflow,
  ReviewCreateWorkflow,
  ReviewRequestCreateWorkflow,
} from "./CreateWorkflows.js";

export const workflows = [
  RatingCriterionCreateWorkflow,
  ReviewCreateWorkflow,
  ProductQuestionCreateWorkflow,
  ReviewRequestCreateWorkflow,
  ModerationCaseCreateWorkflow,
  ContentExternalReferenceCreateWorkflow,
];

export * from "./CreateWorkflows.js";
