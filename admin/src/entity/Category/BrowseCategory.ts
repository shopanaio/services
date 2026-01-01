import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import { ApiCategory, EntityStatus } from '@src/graphql';

export interface IBrowseCategory {
  title: string;
  createdAt: Date;
  id: ID;
  updatedAt: Date;
  status: EntityStatus;
  cover: IMediaFile | null;
  slug: string;
  __typename: 'Category';
}

export class BrowseCategory {
  static create(data: ApiCategory): IBrowseCategory | null {
    try {
      return {
        __typename: data.__typename!,
        cover: data.cover ? MediaFile.create(data.cover) : null,
        title: data.title,
        createdAt: new Date(data.createdAt),
        id: data.id,
        updatedAt: new Date(data.updatedAt),
        status: data.status as EntityStatus,
        slug: data.slug,
      };
    } catch (e) {
      console.error('Category construction failed');
      return null;
    }
  }
}
