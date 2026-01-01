import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import { ApiShippingService } from '@src/graphql';

export interface IShippingService {
  id: string;
  name: string;
  cover: IMediaFile | null;
}

export class ShippingService {
  static create(data: ApiShippingService): IShippingService | null {
    return {
      id: data.code,
      name: data.name,
      cover: data.cover ? MediaFile.create(data.cover) : null,
    };
  }
}
