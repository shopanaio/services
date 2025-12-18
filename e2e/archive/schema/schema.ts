import { ApiFeature, ApiProject, ApiUser, ApiVariant } from '@codegen/admin-gql';
import * as Yup from 'yup';

export const projectSchema = Yup.object<ApiProject>().shape({
  id: Yup.string().required('ID is required'),
  name: Yup.string().required('Name is required'),
  slug: Yup.string().required('Slug key is required'),
  status: Yup.string().required('Status is required'),
});

export const userSchema = Yup.object<ApiUser>().shape({
  id: Yup.string().required('ID is required'),
  email: Yup.string().email('Invalid email format').required('Email is required'),
  firstName: Yup.string().required('Name is required'),
  lastName: Yup.string().required('Last Name is required'),
});

/* ---------- product ---------- */

export const productFeatureSchema = Yup.object<ApiFeature>().shape({
  isAttribute: Yup.boolean().required(),
  isOption: Yup.boolean().required(),
  attributeSortIndex: Yup.number().required(),
  optionSortIndex: Yup.number().required(),
  feature: Yup.object({
    id: Yup.number().required(),
    sortIndex: Yup.number().required(),
    title: Yup.string().required(),
    createdAt: Yup.string().required(),
    updatedAt: Yup.string().required(),
  }).required(),
});

export const productItemSchema = Yup.object({
  price: Yup.number().required(),
  stockStatus: Yup.string().required(),
  features: Yup.array().of(productFeatureSchema).required(),
});

export const categorySchema = Yup.object({
  children: Yup.array()
    .of(
      Yup.object({
        products: Yup.array().of(productItemSchema).required(),
      }).required(),
    )
    .required(),
});

export const variantSchema = Yup.object<ApiVariant>().shape({
  categories: Yup.array().of(categorySchema).required(),
});

export const productSchema = Yup.object<ApiUser>().shape({
  title: Yup.string().required(),
  slug: Yup.string().required(),
  status: Yup.string().required(),
  createdAt: Yup.string().required(),
  id: Yup.string().required(),
  updatedAt: Yup.string().required(),
  requiresShipping: Yup.boolean(),
  variants: Yup.array().of(variantSchema).required(),
});

/* ---------- product-end ---------- */

export const paginationSchema = Yup.object({
  page: Yup.number().required(),
  pageSize: Yup.number().required(),
  count: Yup.number().required(),
  total: Yup.number().required(),
  pageCount: Yup.number().required(),
});
