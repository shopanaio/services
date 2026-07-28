# Components, forms, and interface states

## Contents

- Components as contracts
- Anatomy and behavior
- State matrices
- Forms
- Tables and repeated objects
- Empty, loading, and error states
- Exercises and rubric
- Sources

## Components as contracts

A component is a reusable agreement among meaning, anatomy, behavior, content, accessibility,
and implementation. Visual similarity alone does not justify one component; shared semantics
and behavior do.

Before creating a component, ask:

- Is the pattern repeated?
- Does it carry stable meaning?
- Do instances require the same behavior and accessibility contract?
- Would central governance reduce risk?
- Are differences variants or actually different concepts?

Avoid abstracting a one-off composition prematurely. Avoid creating a "universal card" whose
variants encode unrelated products.

## Anatomy and behavior

Document:

- purpose and when not to use;
- required and optional anatomy;
- content constraints;
- variants and sizes;
- interaction and keyboard model;
- focus order and accessible name;
- responsive behavior;
- localization;
- state and transition model;
- composition rules;
- examples and anti-examples.

Visible anatomy and semantic anatomy are not identical. An icon button still requires an
accessible name; a visually grouped field still needs programmatic relationships.

## State matrices

Do not stop at default, hover, and disabled. Consider:

```text
availability: enabled | disabled | read-only | permission-limited
pointer: rest | hover | pressed | dragging
keyboard: unfocused | focused | focus-visible
selection: unselected | selected | mixed | current
validation: neutral | warning | invalid | valid
async: idle | pending | progress | success | failure | cancelled
data: empty | partial | stale | offline | conflict
```

Only relevant dimensions should appear in a component, but the product must resolve their
combinations. Define precedence: how does selected + focused + invalid appear without ambiguity?

Disabled controls are often poorly explained. If an action is unavailable, consider leaving it
enabled and explaining the failed precondition, or pair disabled state with a discoverable
reason. Do not rely on tooltips for touch or keyboard-only access.

## Forms

### Structure

- Ask only for information required by the current outcome.
- Group by user meaning, not database table.
- Follow a plausible completion order.
- Use one column for most data entry; use multiple columns only for tightly related short fields.
- Keep persistent labels.
- Show format examples and constraints before failure.
- Mark optionality consistently.
- Preserve values through error and navigation.

### Control selection

- Checkbox: independent binary choices or opt-in.
- Radio group: one choice from a small visible set.
- Select/listbox: constrained choice where displaying all options is costly.
- Combobox: selection with search or free entry, with a defined keyboard model.
- Switch: immediate on/off setting, not submission of a form.
- Button: action.
- Link: navigation.

Choose native controls when they meet the need. Custom controls inherit responsibility for
keyboard, focus, semantics, zoom, high contrast, and assistive technology.

### Validation

Associate errors with fields programmatically and visually. Move focus to an error summary only
when it helps navigation. Avoid clearing the field or reporting a generic failure.

### High-consequence forms

For payment, health, legal, identity, and destructive operations:

- reveal consequences and totals before commitment;
- distinguish review from submit;
- support correction;
- prevent duplicate submission;
- show durable confirmation and reference;
- communicate privacy and retention where relevant.

## Tables and repeated objects

Use a table when the primary task is comparison across consistent attributes. Use a list when
each object's narrative or actions dominate.

Design:

- row identity and selection;
- sort state;
- filters and active constraints;
- column priority and resize behavior;
- numeric alignment;
- truncation and full-value access;
- bulk actions;
- editing and validation;
- sticky regions;
- loading, empty, partial, and stale data;
- keyboard model.

An ARIA `grid` is a composite interactive widget with managed focus, not a visual synonym for a
table. Consult W3C APG before choosing it.

## Empty, loading, and error states

### Empty

Differentiate:

- first use;
- no results after filtering;
- no permission;
- data not yet synchronized;
- user intentionally cleared content;
- feature unavailable.

Explain why it is empty and give the next relevant action. Avoid decorative illustration that
pushes recovery below the fold.

### Loading

Preserve layout to reduce movement. Use skeletons only when shape is predictable; otherwise show
honest progress or a stable placeholder. Keep prior data visible and label it stale when that is
safer than blanking the interface.

### Error

State what failed, impact, retained data, recovery, and support path. Avoid error codes as the
only explanation, but retain diagnostic details when useful.

## Exercises

### Component contract

Choose a seemingly simple control and document purpose, anatomy, content, states, keyboard,
responsive behavior, localization, and non-use cases.

### State collision

Render all meaningful combinations for selected, focus-visible, invalid, loading, and disabled.
Resolve visual conflicts without adding arbitrary decoration.

### Form reduction

Take a 20-field form. For every field identify decision use, legal need, inference possibility,
timing, and consequence of omission. Redesign the sequence.

### Table task test

List the five most common table tasks. Reprioritize columns, controls, and density around those
tasks rather than showing every available field.

## Critique rubric

- Does each component have stable semantics and behavior?
- Are state combinations and precedence defined?
- Do forms follow user meaning and minimize unnecessary entry?
- Are native semantics preserved or responsibly recreated?
- Are table structure and interaction matched to comparison tasks?
- Are loading, empty, error, stale, partial, and permission states distinct?
- Is recovery visible and data-preserving?

## Sources and further study

- [W3C ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [W3C APG grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [GOV.UK Design System components](https://design-system.service.gov.uk/components/)
- [GOV.UK Design System patterns](https://design-system.service.gov.uk/patterns/)
- [IBM Carbon form accessibility](https://carbondesignsystem.com/components/form/accessibility/)
- [Baymard checkout usability research](https://baymard.com/research/checkout-usability)
- Caroline Jarrett and Gerry Gaffney, *Forms That Work*.
- Adam Silver, *Form Design Patterns*.
