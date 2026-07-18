# Shopana Pencil workspace

## Structure

- `library/shopana-ui.lib.pen` — shared design tokens and reusable Admin UI components.
- `domains/discounts.pen` — discount pages, modals, flows, and UI states.
- `archive/` — superseded Pencil files kept for reference during migrations.
- `shopana.pen` — temporary migration backup; do not add new screens here.

## File ownership

The UI library contains reusable primitives and composed components only. Domain
files contain product screens and flow-specific compositions. A domain file may
import the UI library, but shared components must not be copied back into domain
files as new sources of truth.

## Naming

Reusable components use category-first names:

- `Button/Primary/Small`
- `Radio/Checked`
- `ModalStack/Overlay`
- `Paper/Header`

Screens and states use domain-first names:

- `Discounts/List/Default`
- `Discounts/List/Empty`
- `Discounts/Create/Default`
- `Discounts/Create/Validation Error`

## Workflow

1. Change shared tokens and components in `library/shopana-ui.lib.pen`.
2. Import that library into the relevant domain file through Pencil Libraries.
3. Build pages from imported component instances and local page composition.
4. Keep loading, empty, error, and success states next to the default screen.
5. Save the active Pencil document explicitly; Pencil does not auto-save.

