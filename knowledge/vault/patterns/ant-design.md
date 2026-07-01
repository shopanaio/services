# Ant Design

## Menu item test ids

When adding test ids to Ant Design `Dropdown` or `Menu` items, put `data-testid`
on the menu item object itself.

Use this pattern:

```tsx
const items = options.map(({ label, value }) => ({
  key: value,
  label,
  "data-testid": `menu-item-${value}`,
  onClick: () => onChange(value),
}));
```

Avoid this pattern:

```tsx
const items = [
  {
    key: "delete",
    label: <span data-testid="delete-menu-item">Delete</span>,
  },
];
```
