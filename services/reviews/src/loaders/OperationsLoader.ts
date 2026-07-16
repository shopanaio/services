import DataLoader from "dataloader";
import type {
  ContentExternalReference,
  ContentReport,
  ContentRevision,
  ContentVote,
  ModerationCase,
  ModerationEvent,
  ModerationSignal,
  ReviewRequest,
  ReviewRequestEvent,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class OperationsLoader {
  public readonly reviewRequest: DataLoader<string, ReviewRequest | null>;
  public readonly reviewRequestEvent: DataLoader<
    string,
    ReviewRequestEvent | null
  >;
  public readonly contentVote: DataLoader<string, ContentVote | null>;
  public readonly contentReport: DataLoader<string, ContentReport | null>;
  public readonly moderationCase: DataLoader<string, ModerationCase | null>;
  public readonly moderationEvent: DataLoader<string, ModerationEvent | null>;
  public readonly contentRevision: DataLoader<string, ContentRevision | null>;
  public readonly moderationSignal: DataLoader<string, ModerationSignal | null>;
  public readonly contentExternalReference: DataLoader<
    string,
    ContentExternalReference | null
  >;

  constructor(repository: Repository) {
    this.reviewRequest = new DataLoader(async (ids) => {
      const rows = await repository.reviewRequest.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });
    this.reviewRequestEvent = new DataLoader(async (ids) => {
      const rows = await repository.reviewRequest.getEventsByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });
    this.contentVote = new DataLoader(async (ids) => {
      const rows = await repository.engagement.getVotesByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });
    this.contentReport = new DataLoader(async (ids) => {
      const rows = await repository.engagement.getReportsByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });
    this.moderationCase = new DataLoader(async (ids) => {
      const rows = await repository.moderation.getCasesByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });
    this.moderationEvent = new DataLoader(async (ids) => {
      const rows = await repository.moderation.getEventsByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });
    this.contentRevision = new DataLoader(async (ids) => {
      const rows = await repository.moderation.getRevisionsByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });
    this.moderationSignal = new DataLoader(async (ids) => {
      const rows = await repository.moderation.getSignalsByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });
    this.contentExternalReference = new DataLoader(async (ids) => {
      const rows = await repository.externalReference.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });
  }
}
