import {
  BrowseCategory,
  IBrowseCategory,
} from '@src/entity/Category/BrowseCategory';
import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import { sanitizeEntries } from '@src/entity/utils';
import { ApiCategory, EntityStatus, ListingSort } from '@src/graphql';

export interface ICategory {
  title: string;
  description: string | null;
  excerpt: string | null;
  subcategories: ICategory[];
  createdAt: Date;
  id: ID;
  listingOrderBy: ListingSort;
  listingOrderByStatus: boolean;
  includeChildrenProducts: boolean;
  parents?: IBrowseCategory[];
  slug: string;
  status: EntityStatus;
  updatedAt: Date;
  cover: IMediaFile | null;
  listingPlacement: number | null;
  gallery: IMediaFile[];
  seoTitle: string | null;
  seoDescription: string | null;
  __typename: 'Category';
}

export class Category {
  static create(data: ApiCategory): ICategory | null {
    try {
      return {
        subcategories: (data.children || [])
          .map(Category.create as any)
          .filter(Boolean) as ICategory[],
        title: data.title,
        description: data.description || null,
        excerpt: data.excerpt || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        createdAt: new Date(data.createdAt),
        id: data.id,
        includeChildrenProducts: data.includeChildrenProducts,
        listingOrderBy: data.listingOrderBy,
        parents: data.parent
          ? sanitizeEntries([BrowseCategory.create(data.parent)])
          : [],
        slug: data.slug,
        status: data.status as EntityStatus,
        listingOrderByStatus: !!data.listingOrderByStatus,
        updatedAt: new Date(data.updatedAt),
        cover: data.cover ? MediaFile.create(data.cover) : null,
        listingPlacement: data.listingPlacement || null,
        gallery: sanitizeEntries(data.gallery?.map(MediaFile.create)),
        __typename: 'Category',
      };
    } catch (e) {
      console.error('Category construction failed');
      return null;
    }
  }
}
