import {
  IProductGroupItem,
  ProductGroupItem,
} from '@src/entity/ProductGroup/ProductGroupItem';
import { ApiProductGroup } from '@src/graphql';

export interface IProductGroup {
  managedVariants: boolean;
  id: ID;
  isMultiple: boolean;
  isRequired: boolean;
  items: IProductGroupItem[];
  sortIndex: number;
  title: string;
}

export class ProductGroup {
  static create(data: ApiProductGroup): IProductGroup | null {
    try {
      const group = {
        title: data.title,
        id: data.id,
        isMultiple: data.isMultiple,
        isRequired: data.isRequired,
        items: (data.items || []).map((it) => ProductGroupItem.create(it)),
        sortIndex: data.sortIndex,
      } as IProductGroup;

      return group;
    } catch (e) {
      console.error('ProductGroup construction failed');
      return null;
    }
  }
}
