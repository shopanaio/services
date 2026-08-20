import DataLoader from "dataloader";
import type {
  RatingCriterion,
  RatingCriterionAssignment,
  RatingCriterionTranslation,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class ConfigurationLoader {
  public readonly ratingCriterion: DataLoader<string, RatingCriterion | null>;
  public readonly ratingCriterionTranslations: DataLoader<string, RatingCriterionTranslation[]>;
  public readonly ratingCriterionAssignments: DataLoader<string, RatingCriterionAssignment[]>;
  public readonly ratingCriterionAssignment: DataLoader<string, RatingCriterionAssignment | null>;

  constructor(repository: Repository) {
    this.ratingCriterion = new DataLoader(async (ids) => {
      const rows = await repository.configuration.getCriteriaByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.ratingCriterionTranslations = new DataLoader(async (criterionIds) => {
      const rows =
        await repository.configuration.getCriterionTranslationsByCriterionIds(criterionIds);
      return criterionIds.map((id) => rows.filter((row) => row.criterionId === id));
    });

    this.ratingCriterionAssignments = new DataLoader(async (criterionIds) => {
      const rows =
        await repository.configuration.getCriterionAssignmentsByCriterionIds(criterionIds);
      return criterionIds.map((id) => rows.filter((row) => row.criterionId === id));
    });

    this.ratingCriterionAssignment = new DataLoader(async (ids) => {
      const rows = await repository.configuration.getCriterionAssignmentsByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });
  }
}
