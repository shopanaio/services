import { gql } from '@apollo/client';
import { ApiCategory } from '@src/graphql';

export type ApiCategoryQueryFindOneResponse = {
  categoryQuery: {
    findOne: ApiCategory;
  };
};

export const FindOneCategoryQuery = gql`
  query FindOneCategory($id: ID!) {
    categoryQuery {
      findOne(id: $id) {
        ...CategoryFragment
        cover {
          ...FileFragment
        }
        children {
          ...BrowseCategoryFragment
        }
        title
        description
        excerpt
        seoTitle
        seoDescription
        parent {
          ...BrowseCategoryFragment
        }
        gallery {
          ...FileFragment
        }
      }
    }
  }
`;
