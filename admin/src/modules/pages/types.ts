import { IDescriptionFields } from '@src/entity/Content/description';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { EntityStatus } from '@src/graphql';

export interface IPageFormValues {
  title: string;
  description: IDescriptionFields | null;
  excerpt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  slug: string;
  status: EntityStatus;
  gallery: IMediaFile[];
}
