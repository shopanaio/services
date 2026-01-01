import { LocaleCode } from '@modules/translations/types';
import {
  getApiRichTextJSON,
  getDescriptionFields,
} from '@src/entity/Content/description';
import {
  ApiTranslation,
  ApiUpdateTranslationInput,
  EntityType,
  TranslationField,
} from '@src/graphql';

export const defaultInformationFieldValues = {
  title: '',
  description: '',
  excerpt: '',
  seoTitle: '',
  seoDescription: '',
  slug: '',
};

export const getInformationFieldValues = (
  record: any,
  entityType: EntityType,
) => {
  const values = {
    title: record.title,
    slug: record.slug,
  };

  if (
    [
      EntityType.ProdContainer,
      EntityType.Category,
      EntityType.Page,
    ].includes(entityType)
  ) {
    return {
      ...values,
      description: getDescriptionFields(record.description),
      excerpt: record.excerpt || '',
      seoTitle: record.seoTitle || '',
      seoDescription: record.seoDescription || '',
    };
  }

  return values;
};

export const getTranslationFieldValue = (it: ApiTranslation) => {
  if (it.fieldName === TranslationField.DescriptionJson) {
    return getDescriptionFields(it.fieldValue) as any as string;
  }

  return it.fieldValue;
};

export const getEntryTranslationRecord = (
  entryTranslations: ApiTranslation[],
) => {
  return entryTranslations.reduce(
    (acc, it) => ({
      ...acc,
      [it.locale]: {
        ...acc[it.locale],
        [it.fieldName]: getTranslationFieldValue(it),
      },
    }),
    {} as Record<LocaleCode, Record<TranslationField, string>>,
  );
};

export const getConnectionTranslationRecord = (
  connectionTranslations: ApiTranslation[],
) => {
  return connectionTranslations.reduce(
    (acc, it) => ({
      ...acc,
      [it.locale]: {
        ...acc[it.locale],
        [it.sourceId]: {
          ...acc[it.locale]?.[it.sourceId],
          [it.fieldName]: getTranslationFieldValue(it),
        },
      },
    }),
    {} as Record<LocaleCode, Record<ID, Record<TranslationField, string>>>,
  );
};
