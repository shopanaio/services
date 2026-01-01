import styled from '@emotion/styled';
import { getProperty, getSpacing } from '@components/utility/utils';

export interface IBoxProps {
  mx?: string;
  my?: string;
  ml?: string;
  mr?: string;
  mt?: string;
  mb?: string;
  px?: string;
  py?: string;
  pl?: string;
  pr?: string;
  pt?: string;
  pb?: string;
  bg?: string;
  boxShadow?: string;
  //
  w?: string;
  minW?: string;
  maxW?: string;
  h?: string;
  minH?: string;
  maxH?: string;
  grow?: string;
}

export const Box = styled.div<IBoxProps>`
  box-sizing: border-box;
  /* padding */
  ${({ px, pl }) => getSpacing('padding-left', px, pl)}
  ${({ px, pr }) => getSpacing('padding-right', px, pr)}
  ${({ py, pt }) => getSpacing('padding-top', py, pt)}
  ${({ py, pb }) => getSpacing('padding-bottom', py, pb)}
  /* margin */
  ${({ mx, ml }) => getSpacing('margin-left', mx, ml)}
  ${({ mx, mr }) => getSpacing('margin-right', mx, mr)}
  ${({ my, mt }) => getSpacing('margin-top', my, mt)}
  ${({ my, mb }) => getSpacing('margin-bottom', my, mb)}
  /* size */
  ${({ w }) => getProperty('width', w)}
  ${({ minW }) => getProperty('min-width', minW)}
  ${({ maxW }) => getProperty('max-width', maxW)}
  ${({ h }) => getProperty('height', h)}
  ${({ minH }) => getProperty('min-height', minH)}
  ${({ maxH }) => getProperty('max-height', maxH)}
  /*  */
  ${({ bg }) => getProperty('background', bg)}
  ${({ boxShadow }) => getProperty('box-shadow', boxShadow)}
  ${({ grow }) => getProperty('flex-grow', grow)}
`;
