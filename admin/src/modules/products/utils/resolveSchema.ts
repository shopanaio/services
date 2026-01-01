import { yupResolver } from '@hookform/resolvers/yup';
import { AnyObjectSchema } from 'yup';

export const resolveSchema = async (schema: AnyObjectSchema, data: any) => {
  const resolve = yupResolver(schema);

  const { errors } = await resolve(data, undefined, {
    shouldUseNativeValidation: false,
    fields: {},
    criteriaMode: 'all',
  });

  return errors;
};
