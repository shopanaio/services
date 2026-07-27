# Layout, grids, spacing, and responsive design

## Contents

- Layout as relationships
- Grid families
- Spacing and density
- Responsive transformation
- Containers and depth
- Interface application
- Exercises and rubric
- Sources

## Layout as relationships

Layout gives information spatial logic. It should reveal sequence, grouping, comparison, scope,
and control. Start with content relationships and task priority; choose a grid that supports
them. Do not begin with a fashionable column count.

Fluent describes space as a means of creating relationships, hierarchy, and decision comfort.
Its 4-unit ramp is one implementation example. The transferable principle is a limited,
meaningful spacing vocabulary with optical exceptions, not universal allegiance to four pixels.

## Grid families

- **Manuscript grid**: one dominant text area; useful for reading and focused forms.
- **Column grid**: flexible vertical alignment for heterogeneous content.
- **Modular grid**: columns plus rows; useful for repeated data, comparison, and dashboards.
- **Baseline grid**: aligns text rhythm across regions.
- **Hierarchical grid**: custom regions organized by content priority rather than equal modules.

Every grid has margins, columns or regions, gutters, and alignment rules. Document when elements
may break the grid and what meaning the break carries.

### Fixed, fluid, and hybrid behavior

- Fixed regions preserve stable tool dimensions but can waste or steal space.
- Fluid regions adapt continuously but need min/max constraints.
- Hybrid layouts combine stable controls with flexible content.

Choose behavior per region. A single screen may have a fixed navigation rail, resizable data
table, and bounded reading column.

## Spacing and density

Create at least three conceptual layers:

- **micro spacing** inside controls and between tightly related elements;
- **component spacing** between elements in a repeated pattern;
- **layout spacing** between regions and major sections.

Use tokens to reduce arbitrary variation, but make optical corrections where icons, type, or
shapes require them. Consistency is perceived, not achieved by blindly repeating the same number.

Density is task-dependent:

- High-frequency expert tools benefit from compactness, stable landmarks, keyboard access, and
  user-adjustable density.
- Reading, onboarding, and high-consequence decisions benefit from focus and separation.
- Touch interfaces need adequate target size even when visual density is high.

Do not equate spaciousness with quality or density with complexity.

## Responsive transformation

Responsive design is not shrinking a desktop canvas. For each region decide whether to:

- resize;
- reflow;
- reposition;
- wrap;
- stack;
- collapse;
- disclose on demand;
- substitute a control;
- preserve through scrolling;
- remove only if nonessential to the task.

Content and interaction breakpoints are preferable to a list of popular device widths. Introduce
a breakpoint when the current composition, reading measure, target size, or task relationship
fails.

### Re-architecture

Some interfaces require a different composition:

- master-detail side by side becomes list then detail;
- persistent filters become a reviewable filter surface;
- comparison tables become prioritized attributes plus horizontal access;
- toolbars become grouped commands or a command palette.

Preserve task continuity and state when changing architecture. Avoid hiding critical actions
without an equally discoverable replacement.

### Text and localization

Test:

- 200% zoom;
- increased default font size;
- large accessibility text;
- long translations;
- right-to-left direction;
- variable date, number, address, and name formats;
- on-screen keyboard and safe-area changes.

## Containers and depth

Use a container when it communicates one of:

- interaction boundary;
- selectable object;
- state or elevation;
- scope;
- drag or resize affordance;
- independent scrolling;
- persistence above another layer.

Do not wrap every group in a card. Space and alignment often communicate grouping with less
visual noise.

Depth should match behavior. A modal blocks context; a popover is anchored; a tooltip provides
transient explanation; a side panel may preserve workspace. Shadows, scrims, overlap, and motion
must agree with that model.

## Interface application

- Put important information in stable, predictable regions.
- Keep line length bounded inside wide fluid layouts.
- Align repeated labels and values to support comparison.
- Reserve full-bleed areas for content that benefits from scale.
- Avoid independent nested scrolling unless the task requires fixed comparative context.
- Specify overflow, minimum widths, wrapping, sticky behavior, and empty space behavior.
- Design the smallest and largest supported conditions, then inspect intermediate widths.

## Exercises

### Grid translation

Lay out the same content using manuscript, column, modular, and hierarchical grids. Explain how
each changes reading and task behavior.

### Responsive transformation matrix

For every region of a complex desktop screen, specify its narrow-screen operation: preserve,
reflow, collapse, substitute, or remove. Prototype the transitions, not only endpoints.

### Density study

Create compact, comfortable, and spacious modes for a data table. Keep target size, hierarchy,
and readability defensible in each.

### Box-removal pass

Remove every border, shadow, and surface. Add back only boundaries that express behavior,
state, or scope.

## Critique rubric

- Does the grid follow content relationships?
- Are spacing intervals systematic but optically corrected?
- Does density match frequency, expertise, and input method?
- Are responsive changes driven by failure points rather than devices?
- Is important state preserved through transformation?
- Do containers correspond to real boundaries or behavior?
- Does the layout survive text growth, localization, zoom, and extreme data?

## Sources and further study

- [Microsoft Fluent 2: Layout](https://fluent2.microsoft.design/layout)
- [Apple Human Interface Guidelines: Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Material Design 3: Layout](https://m3.material.io/foundations/layout/understanding-layout/overview)
- [W3C WCAG 2.2: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [GOV.UK Design System styles](https://design-system.service.gov.uk/styles/)
- Josef Müller-Brockmann, *Grid Systems in Graphic Design*.
- Kimberly Elam, *Grid Systems*.
