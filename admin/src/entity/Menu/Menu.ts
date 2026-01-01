import { IMenuLink, Link } from '@src/entity/Menu/Link';
import { sanitizeEntries } from '@src/entity/utils';
import { ApiMenu, EntityStatus } from '@src/graphql';

export interface IMenu {
  title: string;
  id: ID;
  slug: string;
  status: EntityStatus;
  items: IMenuLink[];
  createdAt: Date;
  updatedAt: Date;
}

export class Menu {
  static create(data: ApiMenu): IMenu {
    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      status: data.status ,
      items: sanitizeEntries((data.items || []).map(Link.create as any)),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }
}
