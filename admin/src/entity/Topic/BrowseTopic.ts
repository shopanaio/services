import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import { ApiTopic, EntityStatus } from '@src/graphql';

export interface IBrowseTopic {
  title: string;
  cover: IMediaFile | null;
  createdAt: Date;
  id: string;
  status: EntityStatus;
  updatedAt: Date;
  slug: string;
}

export class BrowseTopic {
  static create(data: ApiTopic): IBrowseTopic | null {
    try {
      return {
        title: data.title,
        cover: data.cover ? MediaFile.create(data.cover) : null,
        createdAt: new Date(data.createdAt),
        id: data.id,
        status: data.status as EntityStatus,
        updatedAt: new Date(data.updatedAt),
        slug: data.slug,
      };
    } catch (e) {
      console.error('Topic construction failed');
      return null;
    }
  }
}
