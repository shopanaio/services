import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Alert, Button } from 'antd';

export const NewMenu = () => {
  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title="Menu items"
        extra={<Button disabled>Add item</Button>}
      />
      <Alert
        showIcon
        type="info"
        description="Please save your changes before attempting to add menu items."
      />
    </DrawerPaper>
  );
};
