import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import { sanitizeEntries } from '@src/entity/utils';
import { ApiPage, EntityStatus } from '@src/graphql';

export interface IPage {
  cover: IMediaFile | null;
  createdAt: Date;
  description: string | null;
  excerpt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  gallery: IMediaFile[];
  id: string;
  slug: string;
  status: EntityStatus;
  title: string;
  updatedAt: Date;
}

export class Page {
  static create(data: ApiPage): IPage | null {
    try {
      return {
        id: data.id,
        title: data.title,
        description: data.description || null,
        excerpt: data.excerpt || null,
        createdAt: new Date(data.createdAt),
        slug: data.slug,
        status: data.status as EntityStatus,
        updatedAt: new Date(data.updatedAt),
        cover: data.cover ? MediaFile.create(data.cover) : null,
        gallery: sanitizeEntries(data.gallery?.map(MediaFile.create)),
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
      };
    } catch {
      console.error('Failed to create Page entity');
      return null;
    }
  }
}
