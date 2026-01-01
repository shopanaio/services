import { gql } from '@apollo/client';

export const ClearProject = gql`
  mutation ClearProject {
    bulkMutation {
      clear
    }
  }
`;

export const DeleteProject = gql`
  mutation DeleteProject($id: ID!) {
    projectMutation {
      delete(id: $id)
    }
  }
`;
