import {
  IProductFeature,
  IProductFeatureGroup,
} from '@src/entity/Product/ProductFeature';
import { FeatureStyleType } from '@src/graphql';
import { getContentSchema } from '@src/schemas/shared';
import {
  isSyntheticId,
  REAL_ID_LENGTH,
  SYNTHETIC_ID_LENGTH,
  syntheticId,
} from '@src/utils/synthetic-id';
import { uniqBy } from 'lodash';
import * as Yup from 'yup';

export interface IProductOptionFormValues {
  option: IProductFeatureGroup;
  features: IProductFeature[];
}

export const getOptionModalSchema = () =>
  Yup.object().shape({
    option: Yup.object({
      id: Yup.string().min(SYNTHETIC_ID_LENGTH),
      ...getContentSchema(['title'], {
        required: true,
        message: 'Title is required',
      }),
    }).required('Feature is required'),
    features: Yup.array()
      .test('unique-titles', 'Titles must be unique', (items) => {
        if (!items) {
          return true;
        }

        return uniqBy(items, 'title').length === items.length;
      })
      .of(
        Yup.object().shape({
          id: Yup.string().required('Feature is required'),
        }),
      )
      .when('option', ([option], schema) => {
        if (isSyntheticId(option.id)) {
          return schema.of(
            Yup.object().shape({
              id: Yup.string()
                .length(SYNTHETIC_ID_LENGTH, 'New id is invalid')
                .required('Feature is required (id)')
                .typeError('Feature is required (id)'),
              ...getContentSchema(['title'], {
                required: true,
                message: 'Feature is required',
              }),
              color: Yup.mixed(),
            }),
          );
        }

        return schema.of(
          Yup.object().shape({
            id: Yup.string()
              .required('Feature is required (id)')
              .typeError('Feature is required (id)'),
          }),
        );
      })
      .min(1, 'At least one value is required'),
  });

export const defaultValues: IProductOptionFormValues = {
  option: {
    id: syntheticId(),
    title: '',
    slug: '',
    features: [],
    style: FeatureStyleType.Radio,
  },
  features: [],
};
