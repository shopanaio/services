import { ApiLink, MenuNodeType } from '@src/graphql';

export interface IMenuLink {
  title: string;
  createdAt: Date;
  id: ID;
  parentId: ID | null;
  slug: string | null;
  sortIndex: number;
  type: MenuNodeType;
  updatedAt: Date;
  entry: any;
}

export class Link {
  static create(data: ApiLink): IMenuLink {
    return {
      title: data.title,
      createdAt: new Date(data.createdAt),
      entry: data.entry
        ? {
            id: data.entry.id,
            slug: data.entry.slug,
            title: data.entry.title,
          }
        : null,
      id: data.id,
      parentId: data.parentId || null,
      slug: data.slug || null,
      sortIndex: data.sortIndex,
      type: data.type as MenuNodeType,
      updatedAt: new Date(data.updatedAt),
    };
  }
}
