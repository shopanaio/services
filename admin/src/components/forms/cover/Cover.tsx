import { MediaFileControl } from '@components/media/control/MediaFileControl';
import { css } from '@emotion/react';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Controller } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

export const Cover = () => {
  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title={<FormattedMessage id={t('product.media.title')} />}
        name="cover"
      />
      <div
        css={css`
          display: grid;
          grid-template-columns: 1fr 4fr;
          /* grid-template-rows: 100px; */
          grid-column-gap: var(--x4);
        `}
      >
        <Controller
          name="cover"
          render={({ field: { onChange, value } }) => (
            <MediaFileControl
              name="cover"
              file={value}
              onChange={([file]) => onChange(file)}
              onClear={() => onChange(null)}
              multiple={false}
            />
          )}
        />

        <Controller
          name="cover"
          render={({ field: { onChange, value } }) => (
            <MediaFileControl
              name="cover"
              file={value}
              onChange={([file]) => onChange(file)}
              onClear={() => onChange(null)}
              multiple={false}
              square={false}
            />
          )}
        />
      </div>
    </DrawerPaper>
  );
};
