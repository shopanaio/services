import DataLoader from "dataloader";
import type {
  Collection,
  CollectionTranslation,
  CollectionSeo,
  CollectionMedia,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class CollectionLoader {
  public readonly collection: DataLoader<string, Collection | null>;
  public readonly collectionTranslation: DataLoader<string, CollectionTranslation | null>;
  public readonly collectionSeo: DataLoader<string, CollectionSeo | null>;
  public readonly collectionMedia: DataLoader<string, CollectionMedia[]>;

  constructor(repository: Repository) {
    this.collection = new DataLoader<string, Collection | null>(async (ids) => {
      const rows = await repository.collection.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.collectionTranslation = new DataLoader<
      string,
      CollectionTranslation | null
    >(async (ids) => {
      const rows = await repository.collection.getTranslationsByCollectionIds(ids);
      return ids.map(
        (id) => rows.find((row) => row.collectionId === id) ?? null
      );
    });

    this.collectionSeo = new DataLoader<string, CollectionSeo | null>(
      async (ids) => {
        const rows = await repository.collection.getSeoByCollectionIds(ids);
        return ids.map((id) => rows.find((row) => row.collectionId === id) ?? null);
      }
    );

    this.collectionMedia = new DataLoader<string, CollectionMedia[]>(async (ids) => {
      const rows = await repository.collection.getMediaByCollectionIds(ids);
      return ids.map((id) => rows.filter((row) => row.collectionId === id));
    });
  }
}
