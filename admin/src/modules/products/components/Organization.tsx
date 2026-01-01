import { EntryTypeField } from '@components/forms/EntryTypeSelect';
import { EntityType } from '@src/graphql';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';

export const ProductOrganization = () => {
  return (
    <>
      <DrawerPaper>
        <DrawerPaperHeader title="Organization" name="type" />
        <EntryTypeField entityType={EntityType.ProdContainer} />
      </DrawerPaper>
    </>
  );
};
