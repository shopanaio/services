import { cropString, getFilenameFromUrl } from '@src/utils/utils';

interface IFileInfo {
  file: File;
  ext: string;
}

export function downloadAndValidateImage(url: string): Promise<IFileInfo> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = async function () {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          reject(new Error(`HTTP error! status: ${response.status}`));
        }

        const blob = await response.blob();
        const file = new File([blob], getFilenameFromUrl(url!));
        const contentType = response.headers.get('content-type');
        const ext = contentType ? contentType.split('/')[1] : '';
        resolve({ file, ext });
      } catch {
        reject(new Error(`Failed to fetch url: ${cropString(url, 10)}`));
      }
    };

    img.onerror = function () {
      reject(new Error('The file at the URL is not a valid image'));
    };

    img.src = url;
  });
}

/**
 * Extracts the file extension from a given filename.
 *
 * @param filename - The name of the file.
 * @returns The file extension (without the dot) or an empty string if none exists.
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');

  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return ''; // No extension found or hidden file with no extension
  }

  return filename.slice(lastDotIndex + 1);
}
