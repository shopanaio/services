import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import { ConfigurationLoader } from "./ConfigurationLoader.js";
import { ContentLoader } from "./ContentLoader.js";
import { OperationsLoader } from "./OperationsLoader.js";
import { QuestionLoader } from "./QuestionLoader.js";
import { ReviewLoader } from "./ReviewLoader.js";
import { SummaryLoader } from "./SummaryLoader.js";

export class Loader {
  public readonly content;
  public readonly contentMetrics;
  public readonly contentTranslations;
  public readonly contentTranslation;
  public readonly contentPublications;
  public readonly contentPublication;

  public readonly ratingCriterion;
  public readonly ratingCriterionTranslations;
  public readonly ratingCriterionAssignments;
  public readonly ratingCriterionAssignment;

  public readonly review;
  public readonly reviewRatings;
  public readonly reviewMedia;
  public readonly reviewMediaItem;
  public readonly reviewReply;

  public readonly productQuestion;
  public readonly productQuestionAnswer;
  public readonly questionSubscription;

  public readonly reviewRequest;
  public readonly reviewRequestEvent;
  public readonly contentVote;
  public readonly contentReport;
  public readonly moderationCase;
  public readonly moderationEvent;
  public readonly contentRevision;
  public readonly moderationSignal;
  public readonly contentExternalReference;
  public readonly productReviewSummary;
  public readonly productQuestionSummary;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: DataLoader<any, any>;

  constructor(repository: Repository) {
    const content = new ContentLoader(repository);
    const configuration = new ConfigurationLoader(repository);
    const review = new ReviewLoader(repository);
    const question = new QuestionLoader(repository);
    const operations = new OperationsLoader(repository);
    const summary = new SummaryLoader(repository);

    this.content = content.content;
    this.contentMetrics = content.contentMetrics;
    this.contentTranslations = content.contentTranslations;
    this.contentTranslation = content.contentTranslation;
    this.contentPublications = content.contentPublications;
    this.contentPublication = content.contentPublication;

    this.ratingCriterion = configuration.ratingCriterion;
    this.ratingCriterionTranslations = configuration.ratingCriterionTranslations;
    this.ratingCriterionAssignments = configuration.ratingCriterionAssignments;
    this.ratingCriterionAssignment = configuration.ratingCriterionAssignment;

    this.review = review.review;
    this.reviewRatings = review.reviewRatings;
    this.reviewMedia = review.reviewMedia;
    this.reviewMediaItem = review.reviewMediaItem;
    this.reviewReply = review.reviewReply;

    this.productQuestion = question.productQuestion;
    this.productQuestionAnswer = question.productQuestionAnswer;
    this.questionSubscription = question.questionSubscription;

    this.reviewRequest = operations.reviewRequest;
    this.reviewRequestEvent = operations.reviewRequestEvent;
    this.contentVote = operations.contentVote;
    this.contentReport = operations.contentReport;
    this.moderationCase = operations.moderationCase;
    this.moderationEvent = operations.moderationEvent;
    this.contentRevision = operations.contentRevision;
    this.moderationSignal = operations.moderationSignal;
    this.contentExternalReference = operations.contentExternalReference;
    this.productReviewSummary = summary.productReviewSummary;
    this.productQuestionSummary = summary.productQuestionSummary;
  }
}
