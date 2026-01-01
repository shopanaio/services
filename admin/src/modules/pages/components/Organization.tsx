import { EntryTypeField } from '@components/forms/EntryTypeSelect';
import { Tags } from '@components/forms/tags/Tags';
import { EntityType } from '@src/graphql';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';

export const Organization = () => {
  return (
    <>
      <DrawerPaper>
        <DrawerPaperHeader title="Organization" name="organization" />
        <EntryTypeField entityType={EntityType.Page} />
      </DrawerPaper>
      <Tags />
    </>
  );
};
