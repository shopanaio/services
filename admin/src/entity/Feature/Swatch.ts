import { ApiFeatureSwatch, FeatureSwatchType } from '@src/graphql';
import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';

export interface ISwatch {
  id: ID;
  color1: string | null;
  color2: string | null;
  image: IMediaFile | null;
  type: FeatureSwatchType;
}

export class Swatch {
  static create(data: ApiFeatureSwatch): ISwatch | null {
    try {
      return {
        id: data.id,
        color1: data.color1 || null,
        color2: data.color2 || null,
        image: data.image ? MediaFile.create(data.image) : null,
        type: data.type || FeatureSwatchType.Color,
      };
    } catch (e) {
      console.error('Feature construction failed');
      return null;
    }
  }
}
