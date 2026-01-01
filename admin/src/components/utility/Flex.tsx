import styled from '@emotion/styled';
import { getProperty, getSpacing } from '@/components/utility/utils';
import { Box, IBoxProps } from '@/components/utility/Box';

export interface IFlexProps extends IBoxProps {
  direction?: 'column' | 'row';
  align?:
    | 'center'
    | 'flex-start'
    | 'flex-end'
    | 'space-between'
    | 'space-around';
  justify?:
    | 'center'
    | 'flex-start'
    | 'flex-end'
    | 'space-between'
    | 'space-around';
  wrap?: 'wrap' | 'nowrap';
  grow?: string;
  shrink?: string;
  basis?: string;
  gap?: string;
}

export const Flex = styled(Box)<IFlexProps>`
  display: flex;
  ${({ direction }) => getProperty('flex-direction', direction)};
  ${({ justify }) => getProperty('justify-content', justify)};
  ${({ align }) => getProperty('align-items', align)};
  ${({ grow }) => getProperty('flex-grow', grow)};
  ${({ gap }) => getSpacing('gap', gap)};
  ${({ basis }) => getProperty('flex-basis', basis)};
  ${({ shrink }) => getProperty('flex-shrink', shrink)};
  ${({ wrap }) => getProperty('flex-wrap', wrap)};
  /* Box */
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
