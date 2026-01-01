import { gql } from '@apollo/client';
import { ApiPage } from '@src/graphql';

export type ApiPageQueryFindOneResponse = {
  pageQuery: {
    findOne: ApiPage;
  };
};

export const FindOnePageQuery = gql`
  query FindOnePage($id: ID!) {
    pageQuery {
      findOne(id: $id) {
        ...PageFragment
        cover {
          ...FileFragment
        }
        title
        description
        excerpt
        seoTitle
        seoDescription
        gallery {
          ...FileFragment
        }
      }
    }
  }
`;
