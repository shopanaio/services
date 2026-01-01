import { notify } from '@components/feedback/notification';
import { API_ROUTES } from '@modules/router/api';
import { routes } from '@modules/router/routes';
import { PROJECT_KEY_HEADER } from '@src/defs/constants';
import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import { ApiFile } from '@src/graphql';
import { getAuthToken } from '@src/utils/utils';
import { App } from 'antd';
import axios from 'axios';
import { useMutation as useQueryMutation } from 'react-query';
import { matchPath } from 'react-router-dom';

interface IUploadFilesByUrlParams {
  url: string;
}

interface IHandleResultParams {
  onError?: () => void;
  onSuccess?: () => void;
}

export const useUploadFilesByUrls = () => {
  const { message } = App.useApp();

  const { mutateAsync } = useQueryMutation(
    '/api/createFiles',
    async (filesToUpload: IUploadFilesByUrlParams[]) => {
      const token = getAuthToken();

      const match = matchPath(
        { path: routes.store.route, end: false },
        location.pathname,
      );

      const { data } = await axios.post(API_ROUTES.UPLOAD_MANY, filesToUpload, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(match?.params?.storeId
            ? { [PROJECT_KEY_HEADER]: match.params.storeId }
            : {}),
        },
      });

      return data || null;
    },
    {},
  );

  const uploadFiles = async (
    files: IUploadFilesByUrlParams[],
    options?: IHandleResultParams,
  ): Promise<IMediaFile[] | null> => {
    try {
      const response = await mutateAsync(files, {
        onError: () => {
          options?.onError?.();
          notify.error('Failed to upload file');
        },
        onSuccess: () => {
          options?.onSuccess?.();
        },
      });

      if (response) {
        return response.filter(Boolean).map((file: ApiFile) => {
          return MediaFile.create(file);
        });
      }

      return null;
    } catch (err) {
      console.error(err);
      notify.error('Failed to upload file');
      return null;
    }
  };

  return {
    uploadFiles,
  };
};
