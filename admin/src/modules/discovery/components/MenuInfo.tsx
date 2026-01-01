import { Label } from '@components/forms/Label';
import { Slug } from '@components/forms/slug/Slug';
import { Flex } from '@components/utility/Flex';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Input } from 'antd';
import { Controller } from 'react-hook-form';

export const MenuInfo = ({ isNew }: { isNew: boolean }) => {
  return (
    <DrawerPaper>
      <DrawerPaperHeader title="MenuInfo" />
      <Flex w="100%" gap="4">
        <Controller
          name="title"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label required>Title</Label>
                <Input
                  value={field.value}
                  data-testid="title-input"
                  onChange={field.onChange}
                  placeholder="Enter title"
                  status={fieldState?.invalid ? 'error' : undefined}
                  maxLength={255}
                  showCount={{
                    formatter: ({ count, maxLength }) => {
                      return `${count} / ${maxLength}`;
                    },
                  }}
                />
              </Flex>
            );
          }}
        />
        <Slug sync={isNew} referenceName="title" />
      </Flex>
    </DrawerPaper>
  );
};
