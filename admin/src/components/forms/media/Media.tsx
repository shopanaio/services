import { Gallery } from '@components/forms/media/Gallery';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

export const EntityMedia = () => {
  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title={<FormattedMessage id={t('product.media.title')} />}
        name="media"
      />
      <Gallery />
    </DrawerPaper>
  );
};
