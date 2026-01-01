/* eslint-disable check-file/no-index */

import * as yup from 'yup';
import { isRequired } from '@src/schemas/shared/utils';
import { ILocale } from '@src/entity/Locale/Locale';
import { IDescriptionFields } from '@src/entity/Content/description';
import { EntityStatus } from '@src/graphql';

export const SelectOptionSchema = yup.object({
  id: yup.string().required('Option is wrong'),
});

export const getSelectOptionSchema = () => yup.object();

export const getRequiredSelectOptionSchema = (entity = 'Option') =>
  yup
    .object()
    .shape({ id: yup.string().required(`${entity} is required (id)`) })
    .required(`${entity} is required (id)`);

export const getCreatableOptionSchema = (params: {
  entity?: string;
  locales: ILocale[];
  // required?: boolean,
}) => {
  const { locales, entity = 'Option' } = params;

  return yup.object().shape({
    id: yup.mixed().when('isNew', {
      is: true,
      then: () => yup.string().length(10).required(`${entity} id is required`),
      otherwise: () => yup.string().required(),
    }),
    isNew: yup.boolean(),
    content: yup.object().when('isNew', {
      is: true,
      then: (schema) =>
        schema
          .shape({
            ...getOptionContentSchema({ locales, required: true }),
          })
          .required('Content is required when isNew is true'),
      otherwise: (schema) => schema.notRequired(),
    }),
    group: yup.object().when('isNew', {
      is: true,
      then: (schema) =>
        schema
          .shape({
            content: yup
              .object({
                ...getOptionContentSchema({
                  locales,
                  required: true,
                }),
              })
              .required('Group is required'),
          })
          .required('Content is required when isNew is true'),
      otherwise: (schema) => schema.notRequired(),
    }),
  });
};

export const getStatusSchema = (props?: { required?: boolean }) => {
  return {
    status: yup
      .string()
      .oneOf(Object.values(EntityStatus))
      [isRequired(!!props?.required)]('Status is required'),
  };
};

export const getSlugSchema = (_?: (value: string) => Promise<boolean>) => {
  return {
    slug: yup.string().trim().required('Slug is required'),
    // .test(
    //   'unique-slug',
    //   `An entry with the same slug already exists.`,
    //   async (value) => {
    //     if (!unique) {
    //       return true;
    //     }

    //     return unique(value || '');
    //   },
    // ),
  };
};

export const getContentSchema = (
  fields: string[],
  props: {
    required?: boolean;
    message?: string;
  } = {},
) => {
  const { required, message = `Title is required` } = props;

  return fields.reduce(
    (fieldsAcc, field) => ({
      ...fieldsAcc,
      [field]: yup
        .string()
        .min(required && field === 'title' ? 1 : 0, message)
        [isRequired(!!required && field === 'title')](message),
    }),
    {},
  );
};

export const getTranslationSchema = (
  fields: string[],
  props: {
    locales: ILocale[];
    required?: boolean;
    message?: string;
  },
) => {
  const { required, locales, message = `Title is required` } = props;

  return yup
    .object({
      ...locales.reduce(
        (acc, locale) => ({
          ...acc,
          [locale.code]: yup
            .object({
              ...fields.reduce(
                (fieldsAcc, field) => ({
                  ...fieldsAcc,
                  [field]: yup
                    .string()
                    .min(
                      required && field === 'title' ? 1 : 0,
                      `${message} (${locale.title})`,
                    )
                    [isRequired(!!required && field === 'title')](
                      `${message} (${locale.title})`,
                    ),
                }),
                {},
              ),
            })
            [isRequired(!!required)](message),
        }),
        {},
      ),
    })
    .required('Required');
};

export const getOptionContentSchema = (props: {
  locales: ILocale[];
  required?: boolean;
}) => {
  const { required, locales } = props;

  return {
    ...locales.reduce(
      (acc, locale) => ({
        ...acc,
        [locale.code]: yup.object({
          title: yup.string()[isRequired(!!required)](`Field is required`),
        }),
      }),
      {},
    ),
  };
};

export const getOptionGroupSchema = (props: { required: boolean }) => {
  return {
    group: SelectOptionSchema[isRequired(props.required)]('Group is required'),
  };
};

export const getDescriptionSchema = () => {
  return yup
    .object<IDescriptionFields>()
    .shape({
      json: yup.object(),
      html: yup.string(),
      text: yup.string(),
    })
    .nullable();
};
