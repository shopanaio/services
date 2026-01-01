import { EntryTag } from '@components/forms/EntryTag';
import { Label } from '@components/forms/Label';
import { TagsList } from '@components/forms/TagsGrid';
import { Flex } from '@components/utility/Flex';
import { CategorySelect } from '@modules/categories/components/CategorySelect';
import { ICategory } from '@src/entity/Category/Category';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Typography } from 'antd';
import { Switch } from 'antd';
import { Controller } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

export const Organization = () => {
  return (
    <>
      <DrawerPaper>
        <DrawerPaperHeader
          title={<FormattedMessage id={t('category.organization.hierarchy.title')} />}
          name="hierarchy"
        />
        <Flex gap="4" direction="column">
          <Controller
            name="parents"
            render={({ field: { value, onChange } }) => (
              <Flex direction="column">
                <Label>
                  <FormattedMessage id={t('category.organization.parent.label')} />
                </Label>
                <CategorySelect
                  onChange={(next) => {
                    onChange(next?.slice(0, 1) || []);
                  }}
                  data-testid="category-parent-select"
                  multiple={false}
                  value={value}
                />
                {value?.map((it: ICategory) => (
                  <EntryTag
                    key={it.id}
                    entry={it}
                    onClose={() =>
                      onChange(value.filter((v: ICategory) => v.id !== it.id))
                    }
                  />
                ))}
              </Flex>
            )}
          />
          <Controller
            name="children"
            render={({ field: { value, onChange } }) => (
              <Flex direction="column">
                <Label>
                  <FormattedMessage id={t('category.organization.children.label')} />
                </Label>
                <CategorySelect
                  value={value}
                  onChange={onChange}
                  data-testid="category-children-select"
                  multiple
                />
                <TagsList value={value} setValue={onChange} />
              </Flex>
            )}
          />
          <Controller
            name="includeChildrenProducts"
            render={({ field: { value, onChange } }) => (
              <Flex direction="column">
                <Label>
                  <Flex gap="2" align="center">
                    <Switch
                      size="small"
                      data-testid="include-children-switch"
                      checked={value}
                      onChange={onChange}
                    />
                    <Typography.Text>
                      <FormattedMessage id={t('category.organization.includeChildren.label')} />
                    </Typography.Text>
                  </Flex>
                </Label>
                <Typography.Text type="secondary">
                  <FormattedMessage id={t('category.organization.includeChildren.info')} />
                </Typography.Text>
              </Flex>
            )}
          />
        </Flex>
      </DrawerPaper>

    </>
  );
};
