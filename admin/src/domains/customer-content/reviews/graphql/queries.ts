import { gql } from "@apollo/client";
import { REVIEW_EDITOR_FRAGMENT } from "./fragments";

export const REVIEW_QUERY = gql`
  query Review($id: ID!) {
    reviewQuery {
      review(id: $id) {
        ...ReviewEditorFields
      }
    }
  }
  ${REVIEW_EDITOR_FRAGMENT}
`;
