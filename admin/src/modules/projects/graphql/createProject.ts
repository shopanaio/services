import { gql } from '@apollo/client';
import { ApiProject } from '@src/graphql';

export type IProjectMutationCreateResponse = {
  projectMutation: {
    create: ApiProject;
  };
};

export const CreateProjectMutation = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    projectMutation {
      create(input: $input) {
        ...ProjectFragment
      }
    }
  }
`;
