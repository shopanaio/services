import { gql } from '@apollo/client';

export const UpdateProjectMutation = gql`
  mutation UpdateProject($input: UpdateProjectInput!) {
    projectMutation {
      update(input: $input)
    }
  }
`;
