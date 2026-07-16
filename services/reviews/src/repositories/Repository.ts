import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import { ConfigurationRepository } from "./configuration/ConfigurationRepository.js";
import { ContentRepository } from "./content/ContentRepository.js";
import { EngagementRepository } from "./engagement/EngagementRepository.js";
import { ExternalReferenceRepository } from "./integration/ExternalReferenceRepository.js";
import { ModerationRepository } from "./moderation/ModerationRepository.js";
import { ProductQuestionAnswerRepository } from "./question/ProductQuestionAnswerRepository.js";
import { ProductQuestionRepository } from "./question/ProductQuestionRepository.js";
import { QuestionSubscriptionRepository } from "./question/QuestionSubscriptionRepository.js";
import { ReviewReplyRepository } from "./review/ReviewReplyRepository.js";
import { ReviewRepository } from "./review/ReviewRepository.js";
import { ReviewRequestRepository } from "./request/ReviewRequestRepository.js";
import { SummaryRepository } from "./summary/SummaryRepository.js";

export interface RepositoryConfig {
  db: Database;
}

export type { Database };

export class Repository {
  public readonly configuration: ConfigurationRepository;
  public readonly content: ContentRepository;
  public readonly review: ReviewRepository;
  public readonly reviewReply: ReviewReplyRepository;
  public readonly productQuestion: ProductQuestionRepository;
  public readonly productQuestionAnswer: ProductQuestionAnswerRepository;
  public readonly questionSubscription: QuestionSubscriptionRepository;
  public readonly reviewRequest: ReviewRequestRepository;
  public readonly engagement: EngagementRepository;
  public readonly moderation: ModerationRepository;
  public readonly externalReference: ExternalReferenceRepository;
  public readonly summary: SummaryRepository;
  public readonly txManager: TransactionManager<Database>;

  public get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  private constructor(
    configuration: ConfigurationRepository,
    content: ContentRepository,
    review: ReviewRepository,
    reviewReply: ReviewReplyRepository,
    productQuestion: ProductQuestionRepository,
    productQuestionAnswer: ProductQuestionAnswerRepository,
    questionSubscription: QuestionSubscriptionRepository,
    reviewRequest: ReviewRequestRepository,
    engagement: EngagementRepository,
    moderation: ModerationRepository,
    externalReference: ExternalReferenceRepository,
    summary: SummaryRepository,
    txManager: TransactionManager<Database>
  ) {
    this.configuration = configuration;
    this.content = content;
    this.review = review;
    this.reviewReply = reviewReply;
    this.productQuestion = productQuestion;
    this.productQuestionAnswer = productQuestionAnswer;
    this.questionSubscription = questionSubscription;
    this.reviewRequest = reviewRequest;
    this.engagement = engagement;
    this.moderation = moderation;
    this.externalReference = externalReference;
    this.summary = summary;
    this.txManager = txManager;
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    const { db } = config;
    const txManager = new TransactionManager(db);
    const configuration = new ConfigurationRepository(db, txManager);
    const content = new ContentRepository(db, txManager);
    const review = new ReviewRepository(db, txManager, content);
    const reviewReply = new ReviewReplyRepository(db, txManager, content);
    const productQuestion = new ProductQuestionRepository(
      db,
      txManager,
      content
    );
    const productQuestionAnswer = new ProductQuestionAnswerRepository(
      db,
      txManager,
      content
    );
    const questionSubscription = new QuestionSubscriptionRepository(
      db,
      txManager
    );
    const reviewRequest = new ReviewRequestRepository(db, txManager);
    const engagement = new EngagementRepository(db, txManager);
    const moderation = new ModerationRepository(db, txManager);
    const externalReference = new ExternalReferenceRepository(db, txManager);
    const summary = new SummaryRepository(db, txManager);

    return new Repository(
      configuration,
      content,
      review,
      reviewReply,
      productQuestion,
      productQuestionAnswer,
      questionSubscription,
      reviewRequest,
      engagement,
      moderation,
      externalReference,
      summary,
      txManager
    );
  }

  runInTransaction<TResult>(fn: () => Promise<TResult>): Promise<TResult> {
    return this.txManager.run(fn);
  }
}
