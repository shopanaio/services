import { ApiTag } from '@src/graphql';

export interface ITag {
  slug: string;
  id: ID;
  color: string;
  title: string;
}

export class Tag {
  static create(data: ApiTag) {
    return {
      title: data.title,
      id: data.id,
      slug: data.slug,
      color: data.color ? data.color.toLowerCase() : 'default',
    };
  }
}
