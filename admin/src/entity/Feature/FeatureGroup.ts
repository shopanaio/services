import { IFeature, Feature } from '@src/entity/Feature/Feature';
import { ApiFeatureGroup, FeatureStyleType, FeatureType } from '@src/graphql';

export interface IFeatureGroup {
  id: ID;
  title: string;
  slug?: string;
  features: IFeature[];
  isFeature: boolean;
  featureStyleType: FeatureStyleType;
  createdAt: Date;
  updatedAt: Date;
}

export class FeatureGroup {
  static create(data: ApiFeatureGroup): IFeatureGroup | null {
    try {
      const group = {
        id: data.id,
        title: data.title,
        slug: data.slug,
        features: [],
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        isFeature: false,
        featureStyleType: data.featureStyleType,
      } as IFeatureGroup;

      group.features = (data.features || [])
        .map((it) => Feature.create(it, { ...group }))
        .filter(Boolean) as IFeature[];

      return group;
    } catch (e) {
      console.error('FeatureGroup construction failed');
      return null;
    }
  }
}
