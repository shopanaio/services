import DataLoader from "dataloader";
import type {
  ProductQuestion,
  QuestionAnswer,
  QuestionSubscription,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class QuestionLoader {
  public readonly productQuestion: DataLoader<string, ProductQuestion | null>;
  public readonly productQuestionAnswer: DataLoader<string, QuestionAnswer | null>;
  public readonly questionSubscription: DataLoader<string, QuestionSubscription | null>;

  constructor(repository: Repository) {
    this.productQuestion = new DataLoader(async (ids) => {
      const rows = await repository.productQuestion.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.productQuestionAnswer = new DataLoader(async (ids) => {
      const rows = await repository.productQuestionAnswer.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.questionSubscription = new DataLoader(async (ids) => {
      const rows = await repository.questionSubscription.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });
  }
}
