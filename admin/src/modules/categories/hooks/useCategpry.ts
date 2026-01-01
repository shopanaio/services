import { useLazyQuery } from '@apollo/client';
import {
  ApiCategoryQueryFindOneResponse,
  FindOneCategoryQuery,
} from '@modules/categories/graphql/findOne';
import { Category } from '@src/entity/Category/Category';
import { ApiCategoryQueryFindOneArgs } from '@src/graphql';
import { useCallback } from 'react';

export const useFetchCategory = ({ id }: { id: ID }) => {
  const [categoryQuery] = useLazyQuery<
    ApiCategoryQueryFindOneResponse,
    ApiCategoryQueryFindOneArgs
  >(FindOneCategoryQuery, {
    fetchPolicy: 'no-cache',
    variables: { id },
  });

  const fetchCategory = useCallback(async () => {
    const { data } = await categoryQuery();
    if (!data?.categoryQuery?.findOne) {
      throw new Error('Category not found');
    }

    const category = Category.create(data.categoryQuery.findOne);
    if (!category) {
      throw new Error('Category is not valid');
    }

    return category;
  }, [categoryQuery]);

  return fetchCategory;
};
