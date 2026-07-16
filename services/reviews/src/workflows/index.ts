import { ContentExternalReferenceCreateWorkflow } from "./ContentExternalReferenceCreateWorkflow.js";
import { ContentExternalReferenceDeleteWorkflow } from "./ContentExternalReferenceDeleteWorkflow.js";
import { ModerationCaseCreateWorkflow } from "./ModerationCaseCreateWorkflow.js";
import { ProductQuestionCreateWorkflow } from "./ProductQuestionCreateWorkflow.js";
import { ProductQuestionDeleteWorkflow } from "./ProductQuestionDeleteWorkflow.js";
import { ProductQuestionUpdateWorkflow } from "./ProductQuestionUpdateWorkflow.js";
import { RatingCriterionCreateWorkflow } from "./RatingCriterionCreateWorkflow.js";
import { RatingCriterionDeleteWorkflow } from "./RatingCriterionDeleteWorkflow.js";
import { ReviewCreateWorkflow } from "./ReviewCreateWorkflow.js";
import { ReviewDeleteWorkflow } from "./ReviewDeleteWorkflow.js";
import { ReviewUpdateWorkflow } from "./ReviewUpdateWorkflow.js";
import { ReviewRequestCreateWorkflow } from "./ReviewRequestCreateWorkflow.js";

export const workflows = [
  RatingCriterionCreateWorkflow,
  ReviewCreateWorkflow,
  ProductQuestionCreateWorkflow,
  ReviewRequestCreateWorkflow,
  ModerationCaseCreateWorkflow,
  ContentExternalReferenceCreateWorkflow,
  RatingCriterionDeleteWorkflow,
  ReviewDeleteWorkflow,
  ReviewUpdateWorkflow,
  ProductQuestionDeleteWorkflow,
  ProductQuestionUpdateWorkflow,
  ContentExternalReferenceDeleteWorkflow,
];

export * from "./ContentExternalReferenceCreateWorkflow.js";
export * from "./ContentExternalReferenceDeleteWorkflow.js";
export * from "./ModerationCaseCreateWorkflow.js";
export * from "./ProductQuestionCreateWorkflow.js";
export * from "./ProductQuestionDeleteWorkflow.js";
export * from "./ProductQuestionUpdateWorkflow.js";
export * from "./RatingCriterionCreateWorkflow.js";
export * from "./RatingCriterionDeleteWorkflow.js";
export * from "./ReviewCreateWorkflow.js";
export * from "./ReviewDeleteWorkflow.js";
export * from "./ReviewUpdateWorkflow.js";
export * from "./ReviewRequestCreateWorkflow.js";
export * from "./dto/index.js";
