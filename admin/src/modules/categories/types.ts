import { IBrowseCategory } from '@src/entity/Category/BrowseCategory';
import { ICategory } from '@src/entity/Category/Category';
import { IDescriptionFields } from '@src/entity/Content/description';
import { IFilter } from '@src/entity/Filter/types';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { ListingSort, EntityStatus } from '@src/graphql';

export interface ISublistingOption extends IBrowseCategory {
  placement: number;
}

export interface ICategoryFormValues {
  id: ID | null;
  children: ICategory[];
  conditions: IFilter[];
  conditionsType: string;
  title: string;
  description: IDescriptionFields | null;
  excerpt: string | null;
  listingOrderBy: ListingSort;
  includeChildrenProducts: boolean;
  parents: IBrowseCategory[];
  slug: string;
  status: EntityStatus;
  listingOrderByStatus: boolean;
  gallery: IMediaFile[];
  seoTitle: string | null;
  seoDescription: string | null;
}
