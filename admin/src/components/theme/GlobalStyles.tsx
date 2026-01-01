import { colors } from '@components/theme/tokens/colors';
import { fonts } from '@components/theme/tokens/fonts';
import { globalCss } from '@components/theme/tokens/globalStyles';
import { radius } from '@components/theme/tokens/radius';
import { shadows } from '@components/theme/tokens/shadows';
import { spacing } from '@components/theme/tokens/spacing';
import { transitions } from '@components/theme/tokens/transitions';
import { zIndex } from '@components/theme/tokens/z-index';
import { Global, css } from '@emotion/react';

export const GlobalStyles = () => {
  return (
    <Global
      styles={[
        colors,
        zIndex,
        fonts,
        radius,
        spacing,
        transitions,
        globalCss,
        shadows,
        css`
          /* Global styles are going here... */
        `,
      ]}
    />
  );
};
