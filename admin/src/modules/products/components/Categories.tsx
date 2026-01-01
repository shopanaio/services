import { BrowseCategoriesButton } from '@modules/categories/components/BrowseCategoriesButton';
import { ProductCategoriesTable } from '@modules/products/components/CategoriesTable';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Controller } from 'react-hook-form';
import { MdAdd } from 'react-icons/md';

export const ProductCategories = () => {
  return (
    <Controller
      name="categories"
      render={({ field: { value, onChange } }) => (
        <DrawerPaper>
          <DrawerPaperHeader
            title="Categories"
            name="categories"
            extra={
              <BrowseCategoriesButton
                value={value}
                onChange={onChange}
                buttonProps={{
                  icon: <MdAdd />,
                  children: null,
                }}
              />
            }
          />
          <ProductCategoriesTable value={value} onChange={onChange} />
        </DrawerPaper>
      )}
    />
  );
};
