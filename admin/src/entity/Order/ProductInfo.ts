import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import { sanitizeEntries } from '@src/entity/utils';
import { ApiOrderItemProductInfo } from '@src/graphql';

export interface IOrderProductInfo {
  id: ID;
  variantId: ID | null;
  title: string;
  price: number;
  cover: IMediaFile | null;
  options: {
    title: string;
    value: string;
    group: { title: string };
  }[];
  sku: string | null;
}

export class OrderProductInfo {
  static create(data: ApiOrderItemProductInfo): IOrderProductInfo {
    let title = data.snapshot.title;
    if (data.snapshot?.containerTitle) {
      title = `${data.snapshot?.containerTitle} ${title}`;
    }

    return {
      id: data.id,
      variantId: data.variantId || null,
      title,
      price: data.snapshot?.price ?? 0,
      cover: data.snapshot?.cover
        ? MediaFile.create(data.snapshot.cover)
        : null,
      options: sanitizeEntries(
        (data.snapshot.options || []).map((opt: any) => ({
          title: opt.title,
          value: opt.value,
          group: { title: opt.groupTitle },
        })),
      ),
      sku: data.snapshot?.sku ?? null,
    };
  }
}
