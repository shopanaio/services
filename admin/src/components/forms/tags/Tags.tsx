import { Label } from '@/components/forms/Label';
import { Box } from '@/components/utility/Box';
import { DrawerPaper } from '@/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@/layouts/drawer/components/PaperHeader';
import { Controller } from 'react-hook-form';
import { Select, Tag, Space } from 'antd';
import { ITag } from '@/domains/inventory/products/types';

export const Tags = ({ disabled }: { disabled?: boolean }) => {
  return (
    <Controller
      name="tags"
      render={({ field }) => (
        <DrawerPaper>
          <DrawerPaperHeader
            title="Tags"
            badgeCount={field.value?.length || 0}
            showZero={false}
            name="tags"
          />
          <Box w="100%">
            <Label htmlFor="tags-field">Tags</Label>
            <Select
              mode="tags"
              disabled={disabled}
              value={field.value?.map((t: ITag) => t.title) || []}
              onChange={(values: string[]) => {
                field.onChange(
                  values.map((title, idx) => ({
                    id: `tag-${idx}`,
                    title,
                  }))
                );
              }}
              style={{ width: '100%' }}
              placeholder="Add tags..."
              data-testid="tags-field"
            />
            <Space wrap style={{ marginTop: 8 }}>
              {field.value?.map((tag: ITag) => (
                <Tag
                  key={tag.id}
                  closable
                  onClose={() => {
                    field.onChange(
                      field.value.filter((t: ITag) => t.id !== tag.id)
                    );
                  }}
                >
                  {tag.title}
                </Tag>
              ))}
            </Space>
          </Box>
        </DrawerPaper>
      )}
    />
  );
};

export const TagsControl = ({ disabled }: { disabled?: boolean }) => {
  return (
    <Controller
      name="tags"
      render={({ field }) => (
        <Box>
          <Label htmlFor="tags-field">Tags</Label>
          <Select
            mode="tags"
            disabled={disabled}
            value={field.value?.map((t: ITag) => t.title) || []}
            onChange={(values: string[]) => {
              field.onChange(
                values.map((title, idx) => ({
                  id: `tag-${idx}`,
                  title,
                }))
              );
            }}
            style={{ width: '100%' }}
            placeholder="Add tags..."
            data-testid="tags-field"
          />
        </Box>
      )}
    />
  );
};
