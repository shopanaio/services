import { Gallery } from '@/components/forms/media/Gallery';
import { DrawerPaper } from '@/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@/layouts/drawer/components/PaperHeader';

export const EntityMedia = () => {
  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title="Media"
        name="media"
      />
      <Gallery />
    </DrawerPaper>
  );
};
