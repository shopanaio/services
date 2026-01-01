import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  ArchiveManyFilesMutation,
  DeleteFileMutation,
  DeleteManyFilesMutation,
} from '@modules/media/graphql/deleteFile';
import {
  ApiFileMutationArchiveManyArgs,
  ApiFileMutationDeleteManyArgs,
  ApiFileMutationDeleteOneArgs,
  ApiMutation,
} from '@src/graphql';

export const useFileDelete = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiFileMutationDeleteOneArgs
  >(DeleteFileMutation);

  const deleteFile = async (id: ID) => {
    const { data } = await mutation({
      variables: { id },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('File deleted.'),
      onError: () => notify.error('Could not delete file.'),
    });

    return Boolean(data?.fileMutation?.deleteOne);
  };

  return { deleteFile, loading, error };
};

export const useFilesDeleteMany = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiFileMutationDeleteManyArgs
  >(DeleteManyFilesMutation);

  const deleteManyFiles = async (ids: ID[]) => {
    const { data } = await mutation({
      variables: { ids },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Files deleted.'),
      onError: () => notify.error('Could not delete files.'),
    });

    return data?.fileMutation?.deleteMany;
  };

  return { deleteManyFiles, loading, error };
};

export const useFilesArchiveMany = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiFileMutationArchiveManyArgs
  >(ArchiveManyFilesMutation);

  const archiveManyFiles = async (ids: ID[]) => {
    const { data } = await mutation({
      variables: { ids },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Files archived.'),
      onError: () => notify.error('Could not archive files.'),
    });

    return (data?.fileMutation?.archiveMany || []).every(Boolean);
  };

  return { archiveManyFiles, loading, error };
};
