import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import { ApiPost, EntityStatus } from '@src/graphql';

export interface IBrowsePost {
  title: string;
  createdAt: Date;
  id: string;
  updatedAt: Date;
  status: EntityStatus;
  cover: IMediaFile | null;
  slug: string;
}

export class BrowsePost {
  static create(data: ApiPost): IBrowsePost | null {
    try {
      return {
        cover: data.cover ? MediaFile.create(data.cover) : null,
        title: data.title,
        createdAt: new Date(data.createdAt),
        id: data.id,
        updatedAt: new Date(data.updatedAt),
        status: data.status as EntityStatus,
        slug: data.slug,
      };
    } catch (e) {
      console.error('Post construction failed');
      return null;
    }
  }
}
