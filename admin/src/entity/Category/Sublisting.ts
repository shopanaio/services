import {
  BrowseCategory,
  IBrowseCategory,
} from '@src/entity/Category/BrowseCategory';
import { ApiCategorySublistingLink } from '@src/graphql';

export interface ISublistingEntry extends IBrowseCategory {
  placement: number;
}

export class SublistingEntry {
  static create(data: ApiCategorySublistingLink): ISublistingEntry | null {
    try {
      if (data.entry?.__typename !== 'Category') {
        return null;
      }

      const browseCategory = BrowseCategory.create(data.entry);
      if (!browseCategory) {
        return null;
      }

      return {
        ...browseCategory,
        placement: data.placement,
      };
    } catch (e) {
      console.error('SublistingEntry', e);
      return null;
    }
  }
}
