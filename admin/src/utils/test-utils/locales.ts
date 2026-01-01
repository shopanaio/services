import { IContentRecord } from '@src/entity/Content/Content';
import { LocaleEnum } from '@src/entity/Locale/Locale';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { FileDriver } from '@src/graphql';

export const mockEN = {
  code: LocaleEnum.en,
  id: 1,
  title: 'English',
};

export const mockDefaultLocale = mockEN;

export const makeMockContent = (
  title = '',
  props: {
    description?: string;
    excerpt?: string;
  } = {},
): IContentRecord => ({
  [mockEN.code]: Object.assign({ id: 1, locale: mockEN.code, title }, props),
});

export const mockINStock = 'in_stock';

export const mockDefaultStockStatus = mockINStock;

export const makeMockFile = (
  props: {
    id?: number;
    url?: string;
  } = {},
): IMediaFile => ({
  id: props?.id || 1,
  url: props?.url || `https://pixli.dev/mock-file-${props.id}.jpg`,
  driver: FileDriver.Url,
  ext: 'jpg',
  name: 'mock-file',
  size: 100,
});
