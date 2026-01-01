import { FeatureGroup, IFeatureGroup } from '@src/entity/Feature/FeatureGroup';
import { ApiFilter, FilterType } from '@src/graphql';

export interface IProductFilter {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  pageType: string;
  sortIndex: number;
  type: FilterType;
  controlType: string;
  featureGroup?: IFeatureGroup | null;
}

export class ProductFilter {
  static create(data: ApiFilter): IProductFilter {
    return {
      id: data.id,
      title: data.title,
      updatedAt: new Date(data.updatedAt),
      createdAt: new Date(data.createdAt),
      controlType: data.controlType,
      pageType: 'filters',
      sortIndex: data.sortIndex,
      featureGroup: data.featureGroup
        ? FeatureGroup.create(data.featureGroup)
        : undefined,
      type: data.type as FilterType,
    };
  }
}
