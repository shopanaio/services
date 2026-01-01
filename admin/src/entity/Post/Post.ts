import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import { ITopic, Topic } from '@src/entity/Topic/Topic';
import { ApiPost, EntityStatus } from '@src/graphql';

export interface IPost {
  id: string;
  title: string;
  description: string | null;
  excerpt: string | null;
  slug: string;
  status: EntityStatus;
  cover: IMediaFile | null;
  createdAt: Date;
  updatedAt: Date;
  topics: ITopic[];
}

export class Post {
  static create(data: ApiPost): IPost {
    return {
      title: data.title,
      description: data.description || null,
      excerpt: data.excerpt || null,
      createdAt: new Date(data.createdAt),
      id: data.id,
      slug: data.slug,
      status: data.status as EntityStatus,
      updatedAt: new Date(data.updatedAt),
      cover: data.cover ? MediaFile.create(data.cover) : null,
      topics: data.topics ? data.topics.map(Topic.create) : [],
    };
  }
}
