import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import { ApiPaymentService } from '@src/graphql';

export interface IPaymentService {
  cover: IMediaFile | null;
  id: string;
  name: string;
}

export class PaymentService {
  static create(data: ApiPaymentService): IPaymentService | null {
    return {
      id: data.code,
      name: data.name,
      cover: data.cover ? MediaFile.create(data.cover) : null,
    };
  }
}
