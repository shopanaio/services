import { gql } from "@apollo/client";

export const DATA_REQUEST_FIELDS = gql`
  fragment CustomerDataRequestFields on CustomerDataRequest {
    id type status customer { id displayName email } requestedByType requestedById idempotencyKey legalBasis requestMetadata
    resultFileId resultFile { id originalName mimeType url } rejectionReason requestedAt dueAt startedAt finishedAt updatedAt
  }
`;
export const CUSTOMER_DATA_REQUESTS_QUERY = gql`
  query CustomerDataRequests($first: Int, $after: String, $where: CustomerDataRequestWhereInput, $orderBy: [CustomerDataRequestOrderByInput!]) { customersQuery { customerDataRequests(first: $first, after: $after, where: $where, orderBy: $orderBy) { edges { cursor node { ...CustomerDataRequestFields } } pageInfo { hasNextPage hasPreviousPage startCursor endCursor } totalCount } } }
  ${DATA_REQUEST_FIELDS}
`;
export const CUSTOMER_DATA_REQUEST_QUERY = gql`query CustomerDataRequest($id: ID!) { customersQuery { customerDataRequest(id: $id) { ...CustomerDataRequestFields } } } ${DATA_REQUEST_FIELDS}`;
export const CUSTOMER_DATA_REQUEST_CREATE_MUTATION = gql`mutation CustomerDataRequestCreate($input: CustomerDataRequestCreateInput!) { customersMutation { customerDataRequestCreate(input: $input) { dataRequest { ...CustomerDataRequestFields } userErrors { code field message } } } } ${DATA_REQUEST_FIELDS}`;
export const CUSTOMER_DATA_REQUEST_UPDATE_MUTATION = gql`mutation CustomerDataRequestUpdate($dataRequestId: ID!, $operations: CustomerDataRequestUpdateInput) { customersMutation { customerDataRequestUpdate(dataRequestId: $dataRequestId, operations: $operations) { dataRequest { ...CustomerDataRequestFields } operationResults { type applied errors { code field message } } userErrors { code field message } } } } ${DATA_REQUEST_FIELDS}`;
export const CUSTOMER_DATA_REQUEST_DELETE_MUTATION = gql`mutation CustomerDataRequestDelete($input: CustomerDataRequestDeleteInput!) { customersMutation { customerDataRequestDelete(input: $input) { deletedDataRequestId userErrors { code field message } } } }`;

export const MERGE_FIELDS = gql`
  fragment CustomerMergeFields on CustomerMerge { id sourceCustomer { id displayName email } targetCustomer { id displayName email } status reason requestedByType requestedById idempotencyKey resolution errorCode errorMessage requestedAt startedAt finishedAt updatedAt }
`;
export const CUSTOMER_MERGES_QUERY = gql`query CustomerMerges($first: Int, $after: String, $where: CustomerMergeWhereInput, $orderBy: [CustomerMergeOrderByInput!]) { customersQuery { customerMerges(first: $first, after: $after, where: $where, orderBy: $orderBy) { edges { cursor node { ...CustomerMergeFields } } pageInfo { hasNextPage hasPreviousPage startCursor endCursor } totalCount } } } ${MERGE_FIELDS}`;
export const CUSTOMER_MERGE_QUERY = gql`query CustomerMerge($id: ID!) { customersQuery { customerMerge(id: $id) { ...CustomerMergeFields } } } ${MERGE_FIELDS}`;
export const CUSTOMER_MERGE_CREATE_MUTATION = gql`mutation CustomerMergeCreate($input: CustomerMergeCreateInput!) { customersMutation { customerMergeCreate(input: $input) { merge { ...CustomerMergeFields } userErrors { code field message } } } } ${MERGE_FIELDS}`;
export const CUSTOMER_MERGE_UPDATE_MUTATION = gql`mutation CustomerMergeUpdate($mergeId: ID!, $operations: CustomerMergeUpdateInput) { customersMutation { customerMergeUpdate(mergeId: $mergeId, operations: $operations) { merge { ...CustomerMergeFields } operationResults { type applied errors { code field message } } userErrors { code field message } } } } ${MERGE_FIELDS}`;
export const CUSTOMER_MERGE_DELETE_MUTATION = gql`mutation CustomerMergeDelete($input: CustomerMergeDeleteInput!) { customersMutation { customerMergeDelete(input: $input) { deletedMergeId userErrors { code field message } } } }`;
