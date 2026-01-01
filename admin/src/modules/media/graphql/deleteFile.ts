import { gql } from '@apollo/client';

export const DeleteFileMutation = gql`
  mutation DeleteFile($id: ID!) {
    fileMutation {
      deleteOne(id: $id)
    }
  }
`;

export const ArchiveFileMutation = gql`
  mutation ArchiveFile($id: ID!) {
    fileMutation {
      archiveOne(id: $id)
    }
  }
`;

export const DeleteManyFilesMutation = gql`
  mutation DeleteManyFiles($ids: [ID!]!) {
    fileMutation {
      deleteMany(ids: $ids)
    }
  }
`;

export const ArchiveManyFilesMutation = gql`
  mutation ArchiveManyFiles($ids: [ID!]!) {
    fileMutation {
      archiveMany(ids: $ids)
    }
  }
`;
