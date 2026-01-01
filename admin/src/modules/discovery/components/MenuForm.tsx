import { useLazyQuery } from '@apollo/client';
import { TreeItem, TreeItems } from '@components/sortableTree/types';
import { flattenTree } from '@components/sortableTree/utilities';
import { Menu as MenuControl } from '@modules/navigation/components/Menu';
import { MenuInfo } from '@modules/navigation/components/MenuInfo';
import { IRenderNavigationProps } from '@modules/navigation/components/Navigation';
import { NewMenu } from '@modules/navigation/components/NewMenu';
import { defaultMenuFormValues } from '@modules/navigation/defs';
import {
  ApiMenuQueryFindOneResponse,
  MenuFindOne,
} from '@modules/navigation/graphql/menu';
import { useCreateMenu } from '@modules/navigation/hooks/useCreateMenu';
import { useUpdateMenu } from '@modules/navigation/hooks/useUpdateMenu';
import { router } from '@modules/router/router';
import { routes } from '@modules/router/routes';
import { IMenuLink } from '@src/entity/Menu/Link';
import { Menu } from '@src/entity/Menu/Menu';
import { ApiMenuQueryFindOneArgs, ApiUpdateMenuInput } from '@src/graphql';
import { useInitialDelay } from '@src/hooks/useInitialDelay';
import { PageLayout } from '@src/layouts/page/components/PageLayout';
import { ReactNode, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

const createTree = (rawItems: IMenuLink[]): TreeItems => {
  const items = [...rawItems].sort((a, b) => a.sortIndex - b.sortIndex);

  const itemMap: { [key: number]: TreeItem } = {};

  items.forEach((item) => {
    itemMap[item.id] = { ...item, children: [] };
  });

  const roots: TreeItem[] = [];

  items.forEach((item) => {
    if (item.parentId && item.parentId in itemMap) {
      itemMap[item.parentId].children.push(itemMap[item.id]);
    } else {
      roots.push(itemMap[item.id]);
    }
  });

  return roots;
};

interface IMenuFormProps {
  id: string | number;
  renderNavigation: (props: IRenderNavigationProps) => ReactNode;
}

export const MenuForm = ({ id, renderNavigation }: IMenuFormProps) => {
  const isReady = useInitialDelay();

  const isNew = id === 'new';

  const methods = useForm({
    defaultValues: defaultMenuFormValues,
  });

  const { reset, formState, handleSubmit } = methods;
  const { isDirty, dirtyFields, errors } = formState;

  const [menuQuery, { loading }] = useLazyQuery<
    ApiMenuQueryFindOneResponse,
    ApiMenuQueryFindOneArgs
  >(MenuFindOne, { fetchPolicy: 'no-cache' });

  const { createMenu } = useCreateMenu();
  const { updateMenu } = useUpdateMenu();

  useEffect(() => {
    if (isNew) {
      reset(defaultMenuFormValues);
      return;
    }

    (async () => {
      const response = await menuQuery({ variables: { id: id as number } });

      if (response.data?.menuQuery.findOne) {
        const menu = Menu.create(response.data.menuQuery.findOne);

        reset({
          title: menu.title,
          slug: menu.slug,
          menuItems: createTree(menu.items),
        });
      }
    })();
  }, [id, isNew, menuQuery, reset]);

  const onSubmit = handleSubmit(async (data) => {
    if (!isNew) {
      const payload = { id } as ApiUpdateMenuInput;

      if (dirtyFields.title) {
        payload.title = data.title;
      }

      if (dirtyFields.slug) {
        payload.slug = data.slug;
      }

      if (dirtyFields.menuItems) {
        const flattenedTree = flattenTree(data.menuItems);

        payload.items = flattenedTree.map((it) => ({
          id: it.id as number,
          parentId: (it.parentId as number) || 0,
          sortIndex: it.index,
        }));
      }

      const response = await updateMenu(payload);
      if (!response.data?.menuMutation.update) {
        return;
      }

      reset({}, { keepValues: true });
      return;
    }

    const response = await createMenu({
      slug: data.slug,
      title: data.title,
      items: [],
    });

    if (!response.data?.menuMutation.create) {
      return;
    }

    router.navigate(
      routes.navigation.tabLink(`m-${response.data?.menuMutation?.create?.id}`),
    );
  });

  return (
    <FormProvider {...methods}>
      <PageLayout
        errors={errors}
        name="menu"
        headerProps={{
          submitButtonProps: {
            disabled: !isDirty,
            onClick: onSubmit,
          },
          title: id === 'new' ? 'New menu' : 'Menu',
          status: false,
        }}
        leftColumn={[
          <MenuInfo key="info" isNew={isNew} />,
          isNew ? (
            <NewMenu key="menu" />
          ) : (
            <MenuControl
              key="menu"
              loading={!isReady || loading}
              menuId={id as number}
            />
          ),
        ]}
        rightColumn={renderNavigation({
          isDirty,
          save: onSubmit,
        })}
      />
    </FormProvider>
  );
};
