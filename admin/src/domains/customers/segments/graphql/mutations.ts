import { gql } from "@apollo/client";
import { CUSTOMER_SEGMENT_LIST_FRAGMENT } from "./fragments";

export const CUSTOMER_SEGMENT_CREATE_MUTATION = gql`
  mutation CustomerSegmentCreate($input: CustomerSegmentCreateInput!) {
    customersMutation {
      customerSegmentCreate(input: $input) {
        segment {
          ...CustomerSegmentListFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${CUSTOMER_SEGMENT_LIST_FRAGMENT}
`;

export const CUSTOMER_SEGMENT_UPDATE_MUTATION = gql`
  mutation CustomerSegmentUpdate($input: CustomerSegmentUpdateInput!) {
    customersMutation {
      customerSegmentUpdate(input: $input) {
        segment {
          ...CustomerSegmentListFields
        }
        userErrors {
          code
          field
          message
        }
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
        userErrors {
          code
          field
          message
        }
      }
    }
  }
`;

export const CUSTOMER_SEGMENT_MEMBERS_SET_MUTATION = gql`
  mutation CustomerSegmentMembersSet($input: CustomerSegmentMembersSetInput!) {
    customersMutation {
      customerSegmentMembersSet(input: $input) {
        segment {
          ...CustomerSegmentListFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${CUSTOMER_SEGMENT_LIST_FRAGMENT}
`;
