// import { FeatureTranslationValues } from '@modules/translations/hooks/useTranslationFeature';
import { MenuTranslationValues } from '@modules/translations/hooks/useTranslationMenu';
import { ProductTranslationValues } from '@modules/translations/hooks/useTranslationProduct';
import { LocaleCode } from '@modules/translations/types';
import { getApiRichTextJSON } from '@src/entity/Content/description';
import {
  ApiUpdateTranslationInput,
  EntityType,
  TranslationField,
} from '@src/graphql';

export const getInfoTranslationPayload = ({
  id,
  data,
  dirtyFields,
  locale,
}: {
  id: ID;
  data: any;
  dirtyFields: Record<string, boolean>;
  locale: LocaleCode;
}) => {
  const payload: ApiUpdateTranslationInput[] = [];
  const common = {
    sourceId: id,
    sourceType: EntityType.ProdContainer,
    locale,
  };

  if (dirtyFields.title) {
    payload.push({
      fieldName: TranslationField.Title,
      fieldValue: data.title,
      ...common,
    });
  }

  if (dirtyFields.description) {
    const richTextPayload = getApiRichTextJSON(data.description);
    if (richTextPayload) {
      payload.push(
        {
          fieldName: TranslationField.DescriptionJson,
          fieldValue: richTextPayload.json,
          ...common,
        },
        {
          fieldName: TranslationField.DescriptionText,
          fieldValue: richTextPayload.text,
          ...common,
        },
        {
          fieldName: TranslationField.DescriptionHtml,
          fieldValue: richTextPayload.html,
          ...common,
        },
      );
    }
  }

  if (dirtyFields.excerpt) {
    payload.push({
      fieldName: TranslationField.ExcerptText,
      fieldValue: data.excerpt,
      ...common,
    });
  }

  if (dirtyFields.seoDescription) {
    payload.push({
      fieldName: TranslationField.SeoDescription,
      fieldValue: data.seoDescription,
      ...common,
    });
  }

  if (dirtyFields.seoTitle) {
    payload.push({
      fieldName: TranslationField.SeoTitle,
      fieldValue: data.seoTitle,
      ...common,
    });
  }

  return payload;
};

export const getCategoryTranslationPayload = ({
  id,
  data,
  dirtyFields,
  locale,
}: {
  id: ID;
  data: any;
  dirtyFields: Record<string, boolean>;
  locale: LocaleCode;
}) => {
  const payload: ApiUpdateTranslationInput[] = [];
  const common = {
    sourceId: id,
    sourceType: EntityType.Category,
    locale,
  } as const;

  if (dirtyFields.title) {
    payload.push({
      fieldName: TranslationField.Title,
      fieldValue: data.title,
      ...common,
    });
  }

  if (dirtyFields.description) {
    const richTextPayload = getApiRichTextJSON(data.description);
    if (richTextPayload) {
      payload.push(
        {
          fieldName: TranslationField.DescriptionJson,
          fieldValue: richTextPayload.json,
          ...common,
        },
        {
          fieldName: TranslationField.DescriptionText,
          fieldValue: richTextPayload.text,
          ...common,
        },
        {
          fieldName: TranslationField.DescriptionHtml,
          fieldValue: richTextPayload.html,
          ...common,
        },
      );
    }
  }

  if (dirtyFields.excerpt) {
    payload.push({
      fieldName: TranslationField.ExcerptText,
      fieldValue: data.excerpt,
      ...common,
    });
  }

  if (dirtyFields.seoDescription) {
    payload.push({
      fieldName: TranslationField.SeoDescription,
      fieldValue: data.seoDescription,
      ...common,
    });
  }

  if (dirtyFields.seoTitle) {
    payload.push({
      fieldName: TranslationField.SeoTitle,
      fieldValue: data.seoTitle,
      ...common,
    });
  }

  return payload;
};

export const getProductTranslationPayload = (params: {
  id: ID;
  data: ProductTranslationValues;
  dirtyFields: Record<string, any>;
  locale: LocaleCode;
}) => {
  const { data, dirtyFields, locale } = params;
  const payload = getInfoTranslationPayload(params);
  const { variants, groups, features } = data as ProductTranslationValues & {
    features?: Array<{ id: ID; translation: string; isGroup?: boolean }>;
  };

  const pushUnique = (
    acc: ApiUpdateTranslationInput[],
    item: ApiUpdateTranslationInput,
  ) => {
    const key = `${item.sourceType}:${item.sourceId}`;
    const has = acc.some((x) => `${x.sourceType}:${x.sourceId}` === key);
    if (!has) {
      acc.push(item);
    }
  };

  if (dirtyFields.variants) {
    variants.forEach((it, idx) => {
      if (dirtyFields.variants[idx]) {
        pushUnique(payload, {
          sourceId: it.id,
          fieldValue: it.translation,
          fieldName: TranslationField.Title,
          sourceType: EntityType.ProdVariant,
          locale,
        });
      }
    });
  }

  if (dirtyFields.groups) {
    groups.forEach((it, idx) => {
      if (dirtyFields.groups[idx]) {
        pushUnique(payload, {
          sourceId: it.id,
          fieldValue: it.translation,
          fieldName: TranslationField.Title,
          sourceType: EntityType.ProdGroup,
          locale,
        });
      }
    });
  }

  if (dirtyFields.features && Array.isArray(features)) {
    features.forEach((it: any, idx: number) => {
      if (dirtyFields.features[idx]) {
        const isGroup = !!it?.isGroup;
        const sourceType = isGroup
          ? EntityType.ProdFeatGroup
          : EntityType.ProdFeat;
        pushUnique(payload, {
          sourceId: it.id,
          fieldValue: it.translation,
          fieldName: TranslationField.Title,
          sourceType,
          locale,
        });
      }
    });
  }

  return payload;
};

export const getMenuTranslationPayload = (params: {
  id: ID;
  data: MenuTranslationValues;
  dirtyFields: Record<string, any>;
  locale: LocaleCode;
}) => {
  const { id, data, dirtyFields, locale } = params;
  const payload = [] as ApiUpdateTranslationInput[];
  const { title, links } = data;

  if (dirtyFields.title) {
    payload.push({
      sourceId: id,
      fieldValue: title,
      fieldName: TranslationField.Title,
      sourceType: EntityType.Menu,
      locale,
    });
  }

  if (dirtyFields.links) {
    links.forEach((it, idx) => {
      if (dirtyFields.links[idx]) {
        payload.push({
          sourceId: it.id,
          fieldValue: it.translation,
          fieldName: TranslationField.Title,
          sourceType: EntityType.Link,
          locale,
        });
      }
    });
  }

  return payload;
};

export const getTagTranslationPayload = (params: {
  id: ID;
  data: any;
  dirtyFields: Record<string, any>;
  locale: LocaleCode;
}) => {
  const { id, data, dirtyFields, locale } = params;
  const payload = [] as ApiUpdateTranslationInput[];

  if (dirtyFields.title) {
    payload.push({
      sourceId: id,
      fieldValue: data.title,
      fieldName: TranslationField.Title,
      sourceType: EntityType.Tag,
      locale,
    });
  }

  return payload;
};
