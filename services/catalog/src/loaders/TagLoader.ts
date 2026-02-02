import DataLoader from "dataloader";
import type {
  Tag,
  TagTranslation,
  ProductTag,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class TagLoader {
  public readonly tag: DataLoader<string, Tag | null>;
  public readonly tagTranslation: DataLoader<string, TagTranslation | null>;
  public readonly tagProductsCount: DataLoader<string, number>;
  public readonly productTagIds: DataLoader<string, string[]>;

  constructor(repository: Repository) {
    this.tag = new DataLoader<string, Tag | null>(async (tagIds) => {
      const results = await repository.tag.getByIds(tagIds);
      return tagIds.map((id) => results.find((t) => t.id === id) ?? null);
    });

    this.tagTranslation = new DataLoader<string, TagTranslation | null>(
      async (tagIds) => {
        const results = await repository.tag.getTranslationsByTagIds(tagIds);
        return tagIds.map(
          (id) => results.find((t) => t.tagId === id) ?? null
        );
      }
    );

    this.tagProductsCount = new DataLoader<string, number>(async (tagIds) => {
      const results = await repository.tag.countProductsByTagIds(tagIds);
      return tagIds.map((id) => results.get(id) ?? 0);
    });

    this.productTagIds = new DataLoader<string, string[]>(
      async (productIds) => {
        const results = await repository.tag.getProductTagsByProductIds(
          productIds
        );
        return productIds.map((id) =>
          results.filter((pt) => pt.productId === id).map((pt) => pt.tagId)
        );
      }
    );
  }
}
