import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Dropdown, Tag, Typography } from 'antd';
import { MdAdd, MdMoreHoriz } from 'react-icons/md';
import { useFormContext } from 'react-hook-form';
import { ICategory } from '@src/entity/Category/Category';
import { BrowseCategoriesButton } from '@modules/categories/components/BrowseCategoriesButton';
import { equalsId } from '@src/utils/utils';
import { partition } from 'lodash';

export const CategoriesTags = () => {
  const { watch, setValue } = useFormContext();
  const [allCategories, primaryCategoryId] = watch([
    'categories',
    'primaryCategoryId',
  ]);

  const onChange = (next: ICategory[]) => {
    setValue('categories', next, { shouldDirty: true });
  };

  const deleteCategory = (id: ID) => {
    onChange(allCategories.filter((it: ICategory) => it.id !== id));
  };

  const setPrimary = (id: ID) => {
    setValue('primaryCategoryId', id, { shouldDirty: true });
  };

  const [[primaryCategory = null], categories] = partition(
    allCategories,
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
                          // @ts-expect-error
                          'data-testid': `delete-primary-category-item`,
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
                          // @ts-expect-error
                          'data-testid': `set-primary-category-item`,
                        },
                        {
                          key: 'delete',
                          label: 'Delete category',
                          onClick: () => {
                            deleteCategory(category.id);
                          },
                          // @ts-expect-error
                          'data-testid': `delete-category-item`,
                        },
                      ],
                    }}
                  >
                    <Tag
                      color="blue"
                      role="button"
                      onClick={() => {}}
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
                <BrowseCategoriesButton
                  value={allCategories}
                  onChange={(next) => {
                    onChange(next as ICategory[]);
                  }}
                  buttonProps={{
                    icon: <MdAdd />,
                    children: null,
                  }}
                  trigger={({ onClick }) => {
                    return (
                      <Tag
                        role="button"
                        data-testid="add-category-button"
                        color="default"
                        key="new"
                        onClick={onClick}
                        style={{ cursor: 'pointer' }}
                      >
                        <Flex align="center" gap="2">
                          <MdAdd />
                          Category
                        </Flex>
                      </Tag>
                    );
                  }}
                />
              </Box>
            </Box>
          </Flex>
        </Flex>
      </DrawerPaper>
    </>
  );
};
