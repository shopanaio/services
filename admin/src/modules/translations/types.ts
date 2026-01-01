export type LocaleCode = string;

export type IGenericTranslationData<T = any> = {
  title: string;
  translations: Record<LocaleCode, T>;
};

export type IConnectionTranslationItem = {
  id: ID;
  label: string;
  translation: string;
  isGroup?: boolean;
};

export type IInformationTranslationValues = {
  title: string;
  description: any;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
};
