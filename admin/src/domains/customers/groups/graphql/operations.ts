import { gql } from "@apollo/client";

export const CUSTOMER_GROUP_FIELDS = gql`
  fragment CustomerGroupFields on CustomerGroup {
    id
    code
    name
    description
    isDefault
    isActive
    revision
    customersCount
    createdAt
    updatedAt
  }
`;

export const CUSTOMER_GROUPS_QUERY = gql`
  query CustomerGroups($first: Int, $after: String, $where: CustomerGroupWhereInput, $orderBy: [CustomerGroupOrderByInput!]) {
    customersQuery {
      customerGroups(first: $first, after: $after, where: $where, orderBy: $orderBy) {
        edges { cursor node { ...CustomerGroupFields } }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
        totalCount
      }
    }
  }
  ${CUSTOMER_GROUP_FIELDS}
`;

export const CUSTOMER_GROUP_QUERY = gql`
  query CustomerGroup($id: ID!) {
    customersQuery {
      customerGroup(id: $id) {
        ...CustomerGroupFields
        customerMemberships(first: 250, orderBy: [{ field: assignedAt, direction: asc }]) {
          edges {
            node {
              id
              isPrimary
              source
              assignedAt
              expiresAt
              isActive
              customer { id displayName email }
            }
          }
          totalCount
        }
      }
    }
  }
  ${CUSTOMER_GROUP_FIELDS}
`;

export const CUSTOMER_GROUP_CREATE_MUTATION = gql`
  mutation CustomerGroupCreate($input: CustomerGroupCreateInput!) {
    customersMutation { customerGroupCreate(input: $input) { group { ...CustomerGroupFields } userErrors { code field message } } }
  }
  ${CUSTOMER_GROUP_FIELDS}
`;

export const CUSTOMER_GROUP_UPDATE_MUTATION = gql`
  mutation CustomerGroupUpdate($groupId: ID!, $expectedRevision: Int!, $operations: CustomerGroupUpdateInput!) {
    customersMutation {
      customerGroupUpdate(groupId: $groupId, expectedRevision: $expectedRevision, operations: $operations) {
        group { ...CustomerGroupFields }
        operationResults { type applied errors { code field message } }
        userErrors { code field message }
      }
    }
  }
  ${CUSTOMER_GROUP_FIELDS}
`;

export const CUSTOMER_GROUP_DELETE_MUTATION = gql`
  mutation CustomerGroupDelete($input: CustomerGroupDeleteInput!) {
    customersMutation { customerGroupDelete(input: $input) { deletedGroupId userErrors { code field message } } }
  }
`;
