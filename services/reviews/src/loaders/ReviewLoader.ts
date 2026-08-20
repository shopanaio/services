import DataLoader from "dataloader";
import type {
  Review,
  ReviewMedia,
  ReviewRating,
  ReviewReply,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class ReviewLoader {
  public readonly review: DataLoader<string, Review | null>;
  public readonly reviewRatings: DataLoader<string, ReviewRating[]>;
  public readonly reviewMedia: DataLoader<string, ReviewMedia[]>;
  public readonly reviewMediaItem: DataLoader<string, ReviewMedia | null>;
  public readonly reviewReply: DataLoader<string, ReviewReply | null>;

  constructor(repository: Repository) {
    this.review = new DataLoader(async (ids) => {
      const rows = await repository.review.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.reviewRatings = new DataLoader(async (reviewIds) => {
      const rows = await repository.review.getRatingsByReviewIds(reviewIds);
      return reviewIds.map((id) => rows.filter((row) => row.reviewId === id));
    });

    this.reviewMedia = new DataLoader(async (reviewIds) => {
      const rows = await repository.review.getMediaByReviewIds(reviewIds);
      return reviewIds.map((id) => rows.filter((row) => row.reviewId === id));
    });

    this.reviewMediaItem = new DataLoader(async (ids) => {
      const rows = await repository.review.getMediaByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.reviewReply = new DataLoader(async (ids) => {
      const rows = await repository.reviewReply.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });
  }
}
