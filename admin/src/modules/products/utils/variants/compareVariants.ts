import diffBy from 'lodash/differenceBy';

type IProductVariant = any;

const idProp = (it: any) => it?.id;
const toSanitized = (array: any[]) => (array || []).filter(idProp);

export const compareVariants = (props: {
  initial: IProductVariant;
  next: IProductVariant;
}) => {
  const { initial, next } = props;

  const nextItems = toSanitized(next?.options);
  const initialItems = toSanitized(initial?.options);

  if (initialItems.length > nextItems.length) {
    /**
     * option group was deleted
     */
    const diff = diffBy(initialItems, nextItems, idProp);
    return diff.length === initialItems.length - nextItems.length;
    //
  } else if (initialItems.length < nextItems.length) {
    /**
     * Option group was added
     */
    const diff = diffBy(nextItems, initialItems, idProp);
    return diff.length === nextItems.length - initialItems.length;
  } else {
    /**
     * Groups could be swapped or didn't change
     */
    return diffBy(initialItems, nextItems, idProp).length === 0;
  }
};
