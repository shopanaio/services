import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import { ApiTopic, EntityStatus } from '@src/graphql';

export interface ITopic {
  title: string;
  createdAt: Date;
  id: string;
  slug: string;
  status: EntityStatus;
  updatedAt: Date;
  cover: IMediaFile | null;
}

export class Topic {
  static create(data: ApiTopic): ITopic {
    return {
      title: data.title,
      createdAt: new Date(data.createdAt),
      id: data.id,
      // posts: data.posts
      //   ? sanitizeEntries([BrowsePost.create(data.post)])
      //   : [],
      slug: data.slug,
      status: data.status as EntityStatus,
      updatedAt: new Date(data.updatedAt),
      cover: data.cover ? MediaFile.create(data.cover) : null,
    };
  }
}
