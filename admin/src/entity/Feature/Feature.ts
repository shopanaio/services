import { FeatureGroup, IFeatureGroup } from '@src/entity/Feature/FeatureGroup';
import { ISwatch, Swatch } from '@src/entity/Feature/Swatch';
import { ApiFeature } from '@src/graphql';

export interface IFeature {
  id: ID;
  slug: string;
  title: string;
  sortIndex: number;
  group: IFeatureGroup | null;
  swatch: ISwatch | null;
  isFeature: true;
}

export class Feature {
  static create(data: ApiFeature, group?: IFeatureGroup): IFeature | null {
    try {
      return {
        title: data.title,
        slug: data.slug,
        id: data.id,
        sortIndex: data.sortIndex,
        group: group || FeatureGroup.create(data.group),
        swatch: data.swatch ? Swatch.create(data.swatch) : null,
        isFeature: true,
      };
    } catch (e) {
      console.error('Feature construction failed');
      return null;
    }
  }
}
