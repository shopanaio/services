import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { AUTH_TOKEN } from '@src/defs/constants';
import { IContentRecord } from '@src/entity/Content/Content';
import { ILocale } from '@src/entity/Locale/Locale';
import { sanitizeEntries } from '@src/entity/utils';

export const cropString = (value: unknown, length = 45) => {
  if (typeof value !== 'string') {
    return '';
  }
  if (value?.length <= length) {
    return value;
  }

  return `${value?.substring(0, length)}...`;
};

export const cropStringInTheMiddle = (value: unknown, length = 45) => {
  if (typeof value !== 'string') {
    return '';
  }
  if (value?.length <= length) {
    return value;
  }

  const half = Math.floor(length / 2);
  return `${value?.substring(0, half)}...${value?.substring(
    value.length - half,
  )}`;
};

export const getOnDragEnd =
  <T extends { id: any }>(array: T[], fn: (data: T[]) => void) =>
  ({ active, over }: DragEndEvent) => {
    if (!array) {
      return;
    }

    if (active.id !== over?.id) {
      const activeIndex = array.findIndex(equalsId(active.id as ID));
      const overIndex = array.findIndex(equalsId(over?.id as ID));

      const result = arrayMove(array as any[], activeIndex, overIndex);
      fn(result);
    }
  };

export const mapEntryId = (it: any) => {
  if (!it) {
    return null;
  }

  return it.id;
};

export const filterById = (id: ID) => (it: any) => it.id !== id;
export const equalsId = (id: ID) => (it: any) => it.id === id;
export const notEqualsId = (id: ID) => (it: any) => it?.id !== id;

export const idEqual = (id: ID) => (it: any) => it.id === id;
export const idNotEqual = (id: ID) => (it: any) => it?.id !== id;

export const createEmptyContent = (locales: ILocale[]) => {
  return locales.reduce((acc, locale) => {
    acc[locale.code] = { title: '', locale: locale.code, id: '' };
    return acc;
  }, {} as IContentRecord);
};

export const filterColumns =
  (activeColumns: string[]) => (column: { key: string }) => {
    if (['actions', 'expand'].includes(column.key)) {
      return column;
    }

    return { ...column, hidden: !activeColumns.find((c) => c === column.key) };
  };

export const transformColumns = (
  activeColumns: { value: string; active: boolean }[],
  allColumns: any[],
) => {
  return sanitizeEntries(
    [
      'expand',
      ...activeColumns
        .filter((column) => column.active)
        .map((column) => column.value),
      'actions',
    ].map((key) => {
      return allColumns.find((column) => column.key === key);
    }),
  );
};

export function getFilenameFromUrl(url: string): string {
  // Create a URL object and get the pathname
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;

  // Split the pathname by '/' and return the last part
  const parts = pathname.split('/');
  return parts[parts.length - 1];
}

export function getFileExtensionFromUrl(url: string): string {
  // Create a URL object and get the pathname
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;

  // Split the pathname by '/' and return the last part
  const parts = pathname.split('.');
  return parts[parts.length - 1];
}

export function getYouTubePreview(videoUrl: string) {
  if (!videoUrl) {
    return null;
  }

  let videoIdRegex;

  const isShorts = videoUrl.includes('shorts');

  if (isShorts) {
    videoIdRegex = /\/shorts\/([^#\&\?]*).*/;
  } else {
    videoIdRegex =
      /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  }

  const match = videoUrl.match(videoIdRegex);
  const videoId = isShorts ? match?.[1] : match?.[2];

  if (videoId && videoId.length === 11) {
    return 'https://img.youtube.com/vi/' + videoId + '/0.jpg';
  } else {
    return null;
  }
}

export function isYoutubeLink(url: string): boolean {
  const pattern = /^(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+/;
  return pattern.test(url);
}

export const getLastSortIndex = <T extends { sortIndex: number }>(
  items: T[],
) => {
  return (items?.at(-1)?.sortIndex || 0) + 1;
};

export const isTableCheckbox = (el: HTMLElement) => {
  return el?.getAttribute('data-testid') === 'table-row-checkbox';
};

export const getTableCheckbox = (el: HTMLElement) => {
  if (isTableCheckbox(el)) {
    return el;
  }

  return (el?.querySelector('[data-testid="table-row-checkbox"]') ||
    null) as HTMLElement | null;
};

export const getExpandRowButton = (el: HTMLElement) => {
  return (el?.querySelector('[data-testid="table-row-expand-button"]') ||
    null) as HTMLElement | null;
};

export const getStoreAvatarColors = (colorScheme = 'gray') => {
  const backgroundColor = `var(--color-${colorScheme}-2)`;
  const color = `var(--color-${colorScheme}-6)`;

  return {
    background: backgroundColor,
    color,
  };
};

export const getAuthToken = () =>
  localStorage.getItem(AUTH_TOKEN) || sessionStorage.getItem(AUTH_TOKEN);

export const handleCellCheckboxClick = (e: any) => {
  const checkbox = getTableCheckbox(e.target as HTMLElement);

  if (checkbox) {
    checkbox.click();
    return;
  }
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
