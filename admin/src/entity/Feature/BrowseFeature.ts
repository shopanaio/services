import { FeatureGroup, IFeatureGroup } from '@src/entity/Feature/FeatureGroup';
import { ApiFeature } from '@src/graphql';

export interface IBrowseFeature {
  title: string;
  id: ID;
  sortIndex: number;
  group: IFeatureGroup;
}

export class BrowseFeature {
  static create(data: ApiFeature): IBrowseFeature | null {
    try {
      return {
        title: data.title,
        id: data.id,
        sortIndex: data.sortIndex,
        group: FeatureGroup.create(data.group)!,
      };
    } catch (e) {
      console.error('Feature construction failed');
      return null;
    }
  }
}
