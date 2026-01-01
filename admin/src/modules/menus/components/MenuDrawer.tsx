import { useLazyQuery } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { EntryStatusAndInfo } from '@components/forms/EntryStatusAndInfo';
import { Information } from '@components/forms/information/Information';
import { SortableTree } from '@components/sortableTree/SortableTree';
import { TreeItem, TreeItems } from '@components/sortableTree/types';
import { removeItem } from '@components/sortableTree/utilities';
import { UniqueIdentifier } from '@dnd-kit/core';
import { LinkModal } from '@modules/menus/components/LinkModal';
import { defaultMenuFormValues, ILinkFormValue } from '@modules/menus/defs';
import { MenuQueries } from '@modules/menus/graphql/menu';
import { useUpdateMenu } from '@modules/menus/hooks/menu';
import { getEditMenuPayload } from '@modules/menus/utils/getEditPayload';
import {
  getEmptyLink,
  getMenuFormValues,
} from '@modules/menus/utils/getFormValues';
import { resolveSchema } from '@modules/products/utils/resolveSchema';
import { entityStatuses } from '@src/defs/constants';
import { IMenu, Menu } from '@src/entity/Menu/Menu';
import { ApiMenu, ApiQuery, EntityType } from '@src/graphql';
import { useCheckSlug } from '@src/modules/shared/hooks/useCheckSlug';
import { DrawerLayout } from '@src/layouts/drawer/components/DrawerLayout';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { useEntityDrawer } from '@src/layouts/drawers/hooks/useEntityDrawer';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { LayoutSkeleton } from '@src/layouts/table/components/Skeleton';
import { getEditMenuSchema } from '@src/schemas/Menu/schema';
import { Button } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { MdAdd } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const MenuDrawer = () => {
  const { formatMessage } = useIntl();
  const { entityId, uuid, forceClose } = useEntityDrawer();

  const shouldClose = useRef(false);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<IMenu | null>(null);
  const [errors, setErrors] = useState({});
  const [menuQuery] = useLazyQuery<ApiQuery>(MenuQueries.MenuFindOne, {
    fetchPolicy: 'no-cache',
    variables: { id: entityId },
  });

  const methods = useForm({
    defaultValues: defaultMenuFormValues,
  });

  const { reset, formState } = methods;
  const { dirtyFields, isDirty } = formState;
  const { checkSlug } = useCheckSlug(EntityType.Menu);
  const { updateMenu } = useUpdateMenu();

  const fetchMenu = useCallback(async () => {
    const { data } = await menuQuery();

    const menu = Menu.create(data?.menuQuery?.findOne as ApiMenu);
    if (!menu) {
      throw new Error('Page not found');
    }

    return menu;
  }, [menuQuery]);

  useEffect(() => {
    $drawers.setDirty({ uuid, isDirty });
  }, [uuid, isDirty]);

  useEffect(() => {
    fetchMenu()
      .then((fetchedMenu) => {
        setMenu(fetchedMenu);
        reset(getMenuFormValues(fetchedMenu));
      })
      .catch((error) => {
        notify.error(error.message);
        forceClose?.();
      })
      .finally(() => {
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [editingLink, setEditingLink] = useState<ILinkFormValue | null>(null);
  const { watch, setValue } = methods;
  const items = watch('menuItems');

  const setItems = (items: TreeItems, shouldDirty = true) => {
    setValue('menuItems', items, { shouldDirty });
  };

  const handleChange = (items: TreeItems) => {
    setItems(items);
  };

  function handleRemove(id: UniqueIdentifier) {
    setItems(removeItem(items, id));
  }

  function handleEdit(item: TreeItem) {
    if (!menu) {
      return;
    }

    setEditingLink({
      id: item.id,
      title: item.title,
      entry: item.entry,
      parentId: item.parentId,
      slug: item.slug,
      sortIndex: item.sortIndex,
      type: item.type,
      children: item.children,
      menuId: menu.id,
    });
  }

  if (!menu || loading) {
    return <LayoutSkeleton filters={false} />;
  }

  const onSubmitLink = async () => {
    try {
      const menu = await fetchMenu();
      setMenu(menu);
      reset(getMenuFormValues(menu));
    } catch {
      notify.error(formatMessage({ id: t('projects.fetchFailed') }));
    }
  };

  const onSubmit = methods.handleSubmit(async (data) => {
    if (dirtyFields.slug && !(await checkSlug(data.slug))) {
      setErrors({
        slug: 'Page with the same slug already exists',
      });

      return;
    }

    const errors = await resolveSchema(getEditMenuSchema(), { ...data });
    setErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }

    try {
      setLoading(true);
      await updateMenu(
        getEditMenuPayload({
          data,
          dirtyFields,
          id: entityId as ID,
        }),
      );
      const updatedMenu = await fetchMenu();
      notify.success(formatMessage({ id: t('common.updated') }));
      if (shouldClose.current) {
        forceClose?.();
        return;
      }
      setMenu(updatedMenu);
      reset(getMenuFormValues(updatedMenu));
      setLoading(false);
    } catch (e) {
      notify.error((e as Error).message);
      setLoading(false);
      shouldClose.current = false;
    }
  });

  return (
    <FormProvider {...methods}>
      <DrawerLayout
        headerProps={{
          name: 'menu-header',
          title:
            menu.title || formatMessage({ id: t('menus.drawer.editTitle') }),
          submitButtonProps: {
            disabled: !isDirty,
            onClick: onSubmit,
          },
          onSubmitAndExit() {
            shouldClose.current = true;
            onSubmit();
          },
        }}
        errors={errors}
        name="menu"
        leftColumn={
          <>
            <Information slug="custom" />
            <DrawerPaper>
              <DrawerPaperHeader
                name="menu-header"
                title={formatMessage({ id: t('menus.menuItems') })}
                extra={
                  <Button
                    data-testid="add-link-button"
                    icon={<MdAdd />}
                    onClick={() => {
                      setEditingLink(getEmptyLink(menu.id, items.length));
                    }}
                  />
                }
              />
              <SortableTree
                value={items}
                onChange={handleChange}
                onEdit={handleEdit}
                onRemove={handleRemove}
              />
              <LinkModal
                link={editingLink}
                onClose={() => setEditingLink(null)}
                open={!!editingLink}
                refetch={onSubmitLink}
              />
            </DrawerPaper>
          </>
        }
        rightColumn={
          <>
            <EntryStatusAndInfo
              statuses={entityStatuses}
              createdAt={menu.createdAt}
              updatedAt={menu.updatedAt}
            />
          </>
        }
      />
    </FormProvider>
  );
};
