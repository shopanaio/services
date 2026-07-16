import { gql } from "@apollo/client";
import { CUSTOMER_SEGMENT_LIST_FRAGMENT } from "./fragments";

export const CUSTOMER_SEGMENT_CREATE_MUTATION = gql`
  mutation CustomerSegmentCreate($input: CustomerSegmentCreateInput!) {
    customersMutation {
      customerSegmentCreate(input: $input) {
        segment { ...CustomerSegmentListFields }
        userErrors { code field message }
      }
    }
  }
  ${CUSTOMER_SEGMENT_LIST_FRAGMENT}
`;

export const CUSTOMER_SEGMENT_UPDATE_MUTATION = gql`
  mutation CustomerSegmentUpdate(
    $segmentId: ID!
    $expectedRevision: Int
    $operations: CustomerSegmentUpdateInput!
  ) {
    customersMutation {
      customerSegmentUpdate(
        segmentId: $segmentId
        expectedRevision: $expectedRevision
        operations: $operations
      ) {
        segment { ...CustomerSegmentListFields }
        operationResults {
          type
          applied
          errors { code field message }
        }
        userErrors { code field message }
      }
    }
  }
  ${CUSTOMER_SEGMENT_LIST_FRAGMENT}
`;

export const CUSTOMER_SEGMENT_DELETE_MUTATION = gql`
  mutation CustomerSegmentDelete($input: CustomerSegmentDeleteInput!) {
    customersMutation {
      customerSegmentDelete(input: $input) {
        deletedSegmentId
        userErrors { code field message }
      }
    }
  }
`;

export const CUSTOMER_SEGMENT_CUSTOMERS_SET_MUTATION = gql`
  mutation CustomerSegmentCustomersSet($input: CustomerSegmentCustomersSetInput!) {
    customersMutation {
      customerSegmentCustomersSet(input: $input) {
        segment { ...CustomerSegmentListFields }
        userErrors { code field message }
      }
    }
  }
  ${CUSTOMER_SEGMENT_LIST_FRAGMENT}
`;
