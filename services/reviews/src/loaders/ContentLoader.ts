import DataLoader from "dataloader";
import type {
  ContentItem,
  ContentMetrics,
  ContentPublication,
  ContentTranslation,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class ContentLoader {
  public readonly content: DataLoader<string, ContentItem | null>;
  public readonly contentMetrics: DataLoader<string, ContentMetrics | null>;
  public readonly contentTranslations: DataLoader<string, ContentTranslation[]>;
  public readonly contentTranslation: DataLoader<
    string,
    ContentTranslation | null
  >;
  public readonly contentPublications: DataLoader<
    string,
    ContentPublication[]
  >;
  public readonly contentPublication: DataLoader<
    string,
    ContentPublication | null
  >;

  constructor(repository: Repository) {
    this.content = new DataLoader(async (ids) => {
      const rows = await repository.content.getByIds(ids, {
        includeDeleted: true,
      });
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.contentMetrics = new DataLoader(async (contentIds) => {
      const rows = await repository.content.getMetricsByContentIds(contentIds);
      return contentIds.map(
        (id) => rows.find((row) => row.contentId === id) ?? null
      );
    });

    this.contentTranslations = new DataLoader(async (contentIds) => {
      const rows = await repository.content.getTranslationsByContentIds(
        contentIds
      );
      return contentIds.map((id) =>
        rows.filter((row) => row.contentId === id)
      );
    });

    this.contentTranslation = new DataLoader(async (ids) => {
      const rows = await repository.content.getTranslationsByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.contentPublications = new DataLoader(async (contentIds) => {
      const rows = await repository.content.getPublicationsByContentIds(
        contentIds
      );
      return contentIds.map((id) =>
        rows.filter((row) => row.contentId === id)
      );
    });

    this.contentPublication = new DataLoader(async (ids) => {
      const rows = await repository.content.getPublicationsByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });
  }
}
