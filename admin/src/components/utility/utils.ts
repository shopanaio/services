import { ROOT_FONT_SIZE } from '@components/theme/tokens/fonts';

export const getSpacing = (property: string, a?: any, b?: any) => {
  const value = a ?? b;
  return value ? `${property}: var(--x${value});` : '';
};

export const getProperty = (property: string, a?: any, b?: any) => {
  const value = a ?? b;
  return value ? `${property}: ${value};` : '';
};

export const pxToRem = (fontSize: number) => `${fontSize / ROOT_FONT_SIZE}rem`;
