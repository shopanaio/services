import { gql } from "@apollo/client";

export const CUSTOMER_TAG_FIELDS = gql`
  fragment CustomerTagFields on CustomerTag { id name normalizedName customersCount createdAt updatedAt }
`;
export const CUSTOMER_TAGS_QUERY = gql`
  query CustomerTags($first: Int, $after: String, $where: CustomerTagWhereInput, $orderBy: [CustomerTagOrderByInput!]) {
    customersQuery { customerTags(first: $first, after: $after, where: $where, orderBy: $orderBy) { edges { cursor node { ...CustomerTagFields } } pageInfo { hasNextPage hasPreviousPage startCursor endCursor } totalCount } }
  }
  ${CUSTOMER_TAG_FIELDS}
`;
export const CUSTOMER_TAG_QUERY = gql`
  query CustomerTag($id: ID!) { customersQuery { customerTag(id: $id) { ...CustomerTagFields customerAssignments(first: 250, orderBy: [{ field: assignedAt, direction: asc }]) { edges { node { id assignedAt assignedById customer { id displayName email } } } totalCount } } } }
  ${CUSTOMER_TAG_FIELDS}
`;
export const CUSTOMER_TAG_CREATE_MUTATION = gql`
  mutation CustomerTagCreate($input: CustomerTagCreateInput!) { customersMutation { customerTagCreate(input: $input) { tag { ...CustomerTagFields } userErrors { code field message } } } }
  ${CUSTOMER_TAG_FIELDS}
`;
export const CUSTOMER_TAG_UPDATE_MUTATION = gql`
  mutation CustomerTagUpdate($tagId: ID!, $operations: CustomerTagUpdateInput) { customersMutation { customerTagUpdate(tagId: $tagId, operations: $operations) { tag { ...CustomerTagFields } operationResults { type applied errors { code field message } } userErrors { code field message } } } }
  ${CUSTOMER_TAG_FIELDS}
`;
export const CUSTOMER_TAG_DELETE_MUTATION = gql`
  mutation CustomerTagDelete($input: CustomerTagDeleteInput!) { customersMutation { customerTagDelete(input: $input) { deletedTagId userErrors { code field message } } } }
`;
