import { ApiLocale } from '@src/graphql';

export enum LocaleEnum {
  en = 'en',
}

export interface ILocale {
  title: string;
  code: LocaleEnum;
  isActive?: boolean;
}

export class Locale {
  static create(data: ApiLocale): ILocale | null {
    try {
      return {
        title: data.title,
        code: data.code as LocaleEnum,
        isActive: data.isActive,
      };
    } catch (e) {
      console.error('Locale construction failed');
      return null;
    }
  }
}
