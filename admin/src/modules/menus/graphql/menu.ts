import { gql } from '@apollo/client';

const MenuFindMany = gql`
  query MenuFindMany($input: MenusInput!) {
    menuQuery {
      findMany(input: $input) {
        data {
          id
          title
          slug
          status
          createdAt
          updatedAt
          items {
            title
          }
        }
        meta {
          page
          pageSize
          count
          total
          pageCount
        }
      }
    }
  }
`;

const MenuFindOne = gql`
  query MenuFindOne2($id: ID!) {
    menuQuery {
      findOne(id: $id) {
        id
        slug
        title
        status
        items {
          title
          id
          type
          entry {
            ... on Variant {
              id
              slug
              title
            }
            ... on Category {
              id
              slug
              title
            }
            ... on Page {
              id
              slug
              title
            }
          }
          slug
          parentId
          sortIndex
        }
      }
    }
  }
`;

const CreateMenuMutation = gql`
  mutation CreateMenu2($input: CreateMenuInput!) {
    menuMutation {
      create(input: $input)
    }
  }
`;

const UpdateMenuMutation = gql`
  mutation UpdateMenu2($input: UpdateMenuInput!) {
    menuMutation {
      update(input: $input)
    }
  }
`;

const CreateLinkMutation = gql`
  mutation CreateLink2($input: CreateLinkInput!) {
    linkMutation {
      create(input: $input) {
        id
      }
    }
  }
`;

const UpdateLinkMutation = gql`
  mutation UpdateLink2($input: UpdateLinkInput!) {
    linkMutation {
      update(input: $input)
    }
  }
`;

export const MenuQueries = {
  MenuFindMany,
  MenuFindOne,
  UpdateLinkMutation,
  CreateLinkMutation,
  CreateMenuMutation,
  UpdateMenuMutation,
};
