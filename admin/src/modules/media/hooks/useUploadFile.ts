import { notify } from '@components/feedback/notification';
import { apolloClient } from '@modules/app/components/Apollo';
import { API_ROUTES } from '@modules/router/api';
import { routes } from '@modules/router/routes';
import { PROJECT_KEY_HEADER } from '@src/defs/constants';
import { GqlQueries } from '@src/defs/gql-queries';
import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import { FileDriver } from '@src/graphql';
import { downloadAndValidateImage } from '@src/utils/files-upload';
import {
  getAuthToken,
  getFilenameFromUrl,
  isYoutubeLink,
} from '@src/utils/utils';
import axios from 'axios';
import { useMutation as useQueryMutation } from 'react-query';
import { matchPath } from 'react-router-dom';

export interface IUploadFileParams {
  driver: FileDriver;
  file?: File;
  url?: string;
  fileName?: string;
  ext?: string;
}

export interface IHandleResultParams {
  onError?: () => void;
  onSuccess?: () => void;
}

export const useUploadFile = () => {
  const { mutateAsync, isLoading } = useQueryMutation(
    '/api/uploadFile',
    async ({ driver, file, url, fileName, ext }: IUploadFileParams) => {
      const token = getAuthToken();

      const match = matchPath(
        { path: routes.store.route, end: false },
        location.pathname,
      );

      const formData = new FormData();
      formData.append('driver', driver);

      if (file) {
        formData.append('file', file);
        formData.append('name', fileName || file.name);
        formData.append('ext', ext || '');
        formData.append('size', file.size.toString());
      }

      if (url) {
        formData.append('url', url);
        formData.append('name', fileName || getFilenameFromUrl(url));
      }

      const { data } = await axios.post(API_ROUTES.UPLOAD_ONE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(match?.params?.storeId
            ? { [PROJECT_KEY_HEADER]: match.params.storeId }
            : {}),
        },
      });

      apolloClient.refetchQueries({ include: [GqlQueries.FindManyFiles] });

      return data || null;
    },
    {},
  );

  const uploadFile = async (
    params: IUploadFileParams & IHandleResultParams,
  ): Promise<IMediaFile | null> => {
    const { onError, onSuccess, ...rest } = params;

    try {
      const response = await mutateAsync(rest, {
        onError: () => {
          onError?.();
          notify.error('Failed to upload file');
        },
        onSuccess: () => {
          onSuccess?.();
        },
      });

      if (response) {
        return MediaFile.create(response);
      }

      return null;
    } catch (err) {
      console.error(err);
      notify.error('Failed to upload file');
      return null;
    }
  };

  return {
    uploadFile,
    loading: isLoading,
  };
};

export const useUploadFileByUrl = () => {
  const { uploadFile, loading } = useUploadFile();

  const uploadFileByUrl = async (
    url: string,
    options: {
      onSuccess?: () => void;
      onError?: () => void;
    } = {},
  ): Promise<IMediaFile | null> => {
    try {
      const payload = {} as IUploadFileParams;

      if (isYoutubeLink(url)) {
        payload.url = url;
        payload.driver = FileDriver.Ytb;
      } else {
        const fileInfo = await downloadAndValidateImage(url as string);
        payload.file = fileInfo.file;
        payload.driver = FileDriver.S3;
        payload.ext = fileInfo.ext;
        payload.url = url;
      }

      const response = (await uploadFile({ ...payload, ...options })) || null;
      apolloClient.refetchQueries({ include: [GqlQueries.FindManyFiles] });

      return response;
    } catch {
      return null;
    }
  };

  return { uploadFileByUrl, loading };
};
