import { API_ROUTES } from '@modules/router/api';
import { ApiFile, FileDriver } from '@src/graphql';
import { syntheticId } from '@src/utils/synthetic-id';

export interface IMediaFile {
  driver: FileDriver;
  ext: string;
  id: ID;
  name: string;
  size: number;
  url: string;
  key: string;
  createdAt?: string;
}

export class MediaFile {
  static getFileUrl = (file: ApiFile) => {
    if (file.driver === FileDriver.Local) {
      return `${API_ROUTES.FILE_SERVER}/${file.url}`;
    }

    return file.url;
  };

  static create(data: ApiFile): IMediaFile | null {
    if (!data) {
      return null;
    }

    try {
      return {
        id: data.id,
        driver: data.driver,
        ext: data.ext,
        name: data.name,
        size: data.size,
        url: MediaFile.getFileUrl(data),
        key: data.key,
        createdAt: data.createdAt,
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  static placeholder(): IMediaFile {
    return MediaFile.create({
      ext: '',
      driver: FileDriver.S3,
      id: syntheticId(),
      url: 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
      size: 0,
      name: '',
      createdAt: '',
      updatedAt: '',
      key: '',
    })!;
  }
}
