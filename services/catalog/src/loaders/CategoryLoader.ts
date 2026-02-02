import DataLoader from "dataloader";
import type {
  Category,
  CategoryTranslation,
  CategoryMedia,
  ProductCategory,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class CategoryLoader {
  public readonly category: DataLoader<string, Category | null>;
  public readonly categoryTranslation: DataLoader<string, CategoryTranslation | null>;
  public readonly categoryMedia: DataLoader<string, CategoryMedia[]>;
  public readonly categoryChildrenIds: DataLoader<string, string[]>;
  public readonly categoryAncestorIds: DataLoader<string, string[]>;
  public readonly categoryProductsCount: DataLoader<string, number>;
  public readonly productCategoryIds: DataLoader<string, string[]>;

  constructor(repository: Repository) {
    this.category = new DataLoader<string, Category | null>(
      async (categoryIds) => {
        const results = await repository.category.getByIds(categoryIds);
        return categoryIds.map(
          (id) => results.find((c) => c.id === id) ?? null
        );
      }
    );

    this.categoryTranslation = new DataLoader<string, CategoryTranslation | null>(
      async (categoryIds) => {
        const results = await repository.category.getTranslationsByCategoryIds(
          categoryIds
        );
        return categoryIds.map(
          (id) => results.find((t) => t.categoryId === id) ?? null
        );
      }
    );

    this.categoryMedia = new DataLoader<string, CategoryMedia[]>(
      async (categoryIds) => {
        const results = await repository.category.getMediaByCategoryIds(
          categoryIds
        );
        return categoryIds.map((id) =>
          results
            .filter((m) => m.categoryId === id)
            .sort((a, b) => a.sortIndex - b.sortIndex)
        );
      }
    );

    this.categoryChildrenIds = new DataLoader<string, string[]>(
      async (parentIds) => {
        const results = await repository.category.getChildrenByParentIds(
          parentIds
        );
        return parentIds.map((id) =>
          results.filter((c) => c.parentId === id).map((c) => c.id)
        );
      }
    );

    this.categoryAncestorIds = new DataLoader<string, string[]>(
      async (categoryIds) => {
        const results = await repository.category.getAncestorIdsByIds(
          categoryIds
        );
        return categoryIds.map((id) => results.get(id) ?? []);
      }
    );

    this.categoryProductsCount = new DataLoader<string, number>(
      async (categoryIds) => {
        const results = await repository.category.countProductsByCategoryIds(
          categoryIds
        );
        return categoryIds.map((id) => results.get(id) ?? 0);
      }
    );

    this.productCategoryIds = new DataLoader<string, string[]>(
      async (productIds) => {
        const results = await repository.category.getProductCategoriesByProductIds(
          productIds
        );
        return productIds.map((id) =>
          results.filter((pc) => pc.productId === id).map((pc) => pc.categoryId)
        );
      }
    );
  }
}
