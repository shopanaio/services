import type { ApiFile } from "@/graphql/types";

export interface ISeoFormValues {
  seoTitle: string;
  seoDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: ApiFile | null;
}

export interface IPreviewProps {
  values: ISeoFormValues;
  productTitle: string;
  baseUrl: string;
  slug?: string;
}
