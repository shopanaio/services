import { Box } from '@/components/utility/Box';
import { Flex } from '@/components/utility/Flex';
import { DrawerPaper } from '@/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@/layouts/drawer/components/PaperHeader';
import { Dropdown, Tag, Typography } from 'antd';
import { MdAdd, MdMoreHoriz } from 'react-icons/md';
import { useFormContext } from 'react-hook-form';
import { ICategory } from '@/domains/inventory/products/types';
import { partition } from 'lodash';

const equalsId = (id: string | null) => (item: { id: string }) => item.id === id;

export const CategoriesTags = () => {
  const { watch, setValue } = useFormContext();
  const [allCategories, primaryCategoryId] = watch([
    'categories',
    'primaryCategoryId',
  ]);

  const onChange = (next: ICategory[]) => {
    setValue('categories', next, { shouldDirty: true });
  };

  const deleteCategory = (id: string) => {
    onChange(allCategories.filter((it: ICategory) => it.id !== id));
  };

  const setPrimary = (id: string) => {
    setValue('primaryCategoryId', id, { shouldDirty: true });
  };

  const [[primaryCategory = null], categories] = partition(
    allCategories || [],
    equalsId(primaryCategoryId),
  );

  return (
    <>
      <DrawerPaper key="categories">
        <DrawerPaperHeader name="categories" title="Categories" />
        <Flex direction="column" gap="4">
          <Flex align="center" gap="4">
            <Box>
              <Typography.Text type="secondary">
                Product categories
              </Typography.Text>
              <Box mt="1">
                {primaryCategory && (
                  <Dropdown
                    trigger={['click']}
                    key={primaryCategory.id}
                    menu={{
                      items: [
                        {
                          key: 'delete',
                          label: 'Delete category',
                          onClick: () => {
                            deleteCategory(primaryCategory.id);
                          },
                        },
                      ],
                    }}
                  >
                    <Tag
                      color="blue-inverse"
                      data-testid="category-item-primary"
                      style={{ cursor: 'pointer' }}
                    >
                      <Flex align="center" gap="2">
                        {primaryCategory.title}
                        <MdMoreHoriz />
                      </Flex>
                    </Tag>
                  </Dropdown>
                )}
                {categories.map((category: ICategory) => (
                  <Dropdown
                    trigger={['click']}
                    key={category.id}
                    menu={{
                      items: [
                        {
                          key: 'set-as-primary',
                          label: 'Set as primary',
                          onClick: () => {
                            setPrimary(category.id);
                          },
                        },
                        {
                          key: 'delete',
                          label: 'Delete category',
                          onClick: () => {
                            deleteCategory(category.id);
                          },
                        },
                      ],
                    }}
                  >
                    <Tag
                      color="blue"
                      role="button"
                      style={{ cursor: 'pointer' }}
                      data-testid="category-item"
                    >
                      <Flex align="center" gap="2">
                        {category.title}
                        <MdMoreHoriz />
                      </Flex>
                    </Tag>
                  </Dropdown>
                ))}
                <Tag
                  role="button"
                  data-testid="add-category-button"
                  color="default"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    // In real app, this would open a category browser modal
                    const newCategory = {
                      id: `cat-${Date.now()}`,
                      title: `Category ${(allCategories?.length || 0) + 1}`,
                    };
                    onChange([...(allCategories || []), newCategory]);
                  }}
                >
                  <Flex align="center" gap="2">
                    <MdAdd />
                    Category
                  </Flex>
                </Tag>
              </Box>
            </Box>
          </Flex>
        </Flex>
      </DrawerPaper>
    </>
  );
};
