import { LocaleEnum } from '@src/entity/Locale/Locale';
import { ApiTranslation } from '@src/graphql';

export interface IContent {
  sourceId: string;
  locale: LocaleEnum;
  title: string;
  excerpt?: string | null;
  description?: string | null;
  meta_description?: string;
  meta_title?: string;
}

export type IContentRecord = Record<LocaleEnum, IContent>;

export class Content {
  static createRecord<T extends IContentRecord>(data: ApiTranslation[]): T {
    return (data || []).reduce((acc, it) => {
      const content = Content.create(it)!;
      return { ...acc, [content.locale as unknown as LocaleEnum]: content };
    }, {} as T);
  }

  static create(data: ApiTranslation): IContent | null {
    try {
      return {
        sourceId: data.sourceId,
        locale: data.locale as unknown as LocaleEnum,
        title: data.title,
        ...(data.description ? { description: data.description } : {}),
        ...(data.excerpt ? { excerpt: data.excerpt } : {}),
      };
    } catch (e: any) {
      console.error('Content construction failed');
      return null;
    }
  }
}
