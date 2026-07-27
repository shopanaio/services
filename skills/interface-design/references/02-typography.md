# Typography for interfaces

## Contents

- Typography as structure
- Anatomy and classification
- Typesetting
- Hierarchy and systems
- Screen and responsive typography
- Selection and pairing
- Interface-specific guidance
- Exercises and rubric
- Sources

## Typography as structure

Typography gives language visible form. It influences reading order, pace, tone, density,
affordance, and trust. Treat it as the primary interface material, not a styling token chosen
after layout.

RISD's typography sequence moves from letterform construction to word, paragraph, and page.
Use the same progression for interfaces: glyph quality, word shape, line, text block, component,
screen, and system.

## Anatomy and classification

Know enough anatomy to explain observed behavior:

- baseline, cap height, x-height;
- ascender and descender;
- stem, stroke, counter, aperture, terminal, serif;
- width, contrast, stress, optical size;
- roman, italic, oblique;
- text and display cuts;
- variable axes such as weight, width, slant, grade, and optical size.

Classification is a vocabulary, not a quality ranking. Serif, sans, grotesk, humanist,
geometric, transitional, and monospace families carry histories and formal tendencies, but
their actual drawing and setting matter more than the label.

## Typesetting

### Measure

Line length must suit type size, language, reading mode, and context. Avoid treating a fixed
character count as a universal law. Long-form reading usually benefits from a constrained
measure; labels and data cells obey different constraints.

### Leading

Line spacing creates vertical rhythm and affects the reader's ability to return to the next
line. Increase leading for long lines, large x-heights, dense languages, and text that must
remain readable under difficult conditions. Display type may use tighter leading if collisions
and diacritics are tested.

### Tracking and kerning

- Use tracking to tune the texture of a span, not to repair a poor typeface.
- Avoid loose tracking in lowercase body text.
- Uppercase labels often need additional tracking, but sentence case is usually faster to read
  and localizes more gracefully.
- Inspect kerning in prominent display text and numerals; do not manually kern routine UI copy.

### Alignment

- Left-align continuous left-to-right text by default.
- Right-align continuous right-to-left text.
- Center short, isolated statements only when the composition benefits from a central axis.
- Right-align numbers in comparison columns and align decimals when precision matters.
- Avoid justified interface text unless language-specific hyphenation and spacing are controlled.

### Typographic color

Typographic color is the perceived density and texture of a text block. Weight, size, leading,
measure, letterspacing, and paragraph spacing all contribute. Judge blocks at reading distance,
not only individual glyphs at high zoom.

## Hierarchy and systems

Build a semantic type system before naming pixel values:

- display or campaign expression;
- page title;
- section title;
- component title;
- body;
- supporting body;
- label;
- caption or metadata;
- data or code.

Use the fewest levels that preserve meaning. Differentiate levels with a controlled combination
of size, weight, line height, spacing, and color. If every level differs on every variable, the
system becomes hard to learn and maintain.

Prefer semantic roles over names such as `font-16-bold`. A role can adapt across viewport,
platform, locale, and accessibility settings without changing meaning.

## Screen and responsive typography

- Support browser zoom and user text-size preferences.
- Avoid locking text in containers with fixed heights.
- Reflow layout when text grows; do not solve scaling with truncation.
- Test at narrow width, 200% zoom, long translations, and large accessibility sizes.
- Use relative units and optical sizes where the platform supports them.
- Pair icons with type by optical size, baseline, weight, and meaning.
- Preserve hierarchy when scale changes. A large-text mode is not simply every number multiplied.

Apple recommends system text styles and Dynamic Type so hierarchy and legibility adapt to user
settings. Fluent demonstrates how one semantic ramp changes across web, Windows, macOS, iOS,
and Android. These are system examples, not universal numeric prescriptions.

## Selection and pairing

Choose a typeface by:

- language and script coverage;
- legibility at target sizes and displays;
- family breadth and variable axes;
- numeral, punctuation, symbol, and currency quality;
- tone appropriate to subject and audience;
- rendering and performance;
- licensing and long-term availability.

Pair only when roles require a meaningful contrast. A single family with optical sizes, widths,
or contrasting weights is often more coherent than a fashionable pairing.

Do not ban or prescribe typefaces by popularity alone. Generic output comes from unexamined
decisions, not from a font name. If a neutral system font best serves a high-frequency tool,
use it deliberately.

## Interface-specific guidance

- Write button labels as actions when they perform actions.
- Give input labels persistent visible space; placeholders are examples, not labels.
- Use tabular numerals for changing values and aligned comparisons.
- Distinguish identifiers, user content, metadata, and system status.
- Avoid low-contrast "muted" text that still contains required information.
- Let content determine component width and wrapping behavior.
- Establish explicit rules for truncation, wrapping, expansion, and full-value access.
- Test mixed scripts, diacritics, emoji, bidirectional text, dates, units, and currencies.

## Exercises

### Typesetting ladder

Set one 500-word article at six measures. Adjust size and leading until each setting forms a
coherent text color. Annotate what changed and why.

### One-family interface

Design an entire data-rich screen with one family and no color hierarchy. Use only size,
weight, width, case, and spacing.

### Localization stress test

Replace concise English labels with realistic German, Ukrainian, Arabic, and Japanese strings.
Repair the system without shrinking all type.

### Numeral study

Design a financial table using proportional, tabular, oldstyle, and lining figures. Explain
which combination supports scanning, comparison, and prose.

## Critique rubric

- Does the typeface support the languages and symbols required?
- Is hierarchy visible but economical?
- Are body measure, leading, and weight comfortable in context?
- Do labels and controls retain meaning under wrapping and scaling?
- Are numerical comparisons aligned appropriately?
- Does the system preserve hierarchy at zoom and large text sizes?
- Is the choice justified by content, task, platform, and brand rather than trend?

## Sources and further study

- [RISD Typography I course description](https://www.risd.edu/academics/graphic-design/courses?page=1)
- [Apple Human Interface Guidelines: Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Microsoft Fluent 2: Typography](https://fluent2.microsoft.design/typography)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C Understanding text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)
- [Material Design 3: Typography](https://m3.material.io/styles/typography/overview)
- Ellen Lupton, *Thinking with Type*.
- Robert Bringhurst, *The Elements of Typographic Style*.
- Sofie Beier, *Reading Letters: Designing for Legibility*.
