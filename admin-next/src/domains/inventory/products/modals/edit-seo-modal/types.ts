import type { IMediaFile } from "@/mocks/products/types";

export interface ISeoFormValues {
  seoTitle: string;
  seoDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: IMediaFile | null;
}

export interface IPreviewProps {
  values: ISeoFormValues;
  productTitle: string;
  baseUrl: string;
  slug?: string;
}
