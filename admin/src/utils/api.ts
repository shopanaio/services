import { remirrorStateUtil } from '@components/editor/Remirror/utils';
import { ContentFieldEnum } from '@src/defs/constants';
import { IContentRecord } from '@src/entity/Content/Content';
import { ILocale } from '@src/entity/Locale/Locale';
import {
  ApiCreateTranslationInput,
  ApiUpdateTranslationInput,
} from '@src/graphql';
import { isEqual } from 'lodash';
import { FieldNamesMarkedBoolean } from 'react-hook-form';
import { EditorState, RemirrorJSON } from 'remirror';

export const mapApiContent = (
  sourceId: string,
  content: IContentRecord,
  locales: ILocale[],
  fields: ContentFieldEnum[] = [ContentFieldEnum.TITLE],
): ApiCreateTranslationInput[] =>
  Object.entries(content).map(([localeCode, value]) => ({
    sourceId,
    localeCode:
      locales.find((locale) => locale.code === localeCode)?.code || '',
    ...fields.reduce((acc, field) => {
      return {
        ...acc,
        ...(value[field] ? { [field]: value[field] } : {}),
      };
    }, {}),
  }));

export const mapApiUpdatedContent = (
  sourceId: string,
  content: IContentRecord,
  dirtyFields: any,
  fields: ContentFieldEnum[] = [ContentFieldEnum.TITLE],
): ApiUpdateTranslationInput[] =>
  Object.entries(content)
    .filter(([localeCode]) => {
      return fields.filter((f) => dirtyFields[localeCode]?.[f]).length > 0;
    })
    .map(([localeCode, value]) => {
      const dirty = dirtyFields[localeCode];

      return {
        sourceId,
        localeCode: localeCode,
        ...fields.reduce((acc, field) => {
          return {
            ...acc,
            ...(dirty[field] ? { [field]: value[field] || '' } : {}),
          };
        }, {}),
      };
    });

export const getContentDirtyFields = (
  initial: IContentRecord,
  current: IContentRecord,
): FieldNamesMarkedBoolean<IContentRecord> => {
  return Object.entries(initial).reduce((acc, [localeCode, content]) => {
    // @ts-expect-error...
    if (!isEqual(content, current[localeCode])) {
      // @ts-expect-error...
      acc[localeCode] = Object.entries(content).reduce(
        (contentAcc, [contentKey, contentValue]) => {
          // @ts-expect-error...
          if (!isEqual(contentValue, current?.[localeCode]?.[contentKey])) {
            // @ts-expect-error...
            contentAcc[contentKey] = true;
          }

          return contentAcc;
        },
        {},
      );
    }

    return acc;
  }, {});
};
