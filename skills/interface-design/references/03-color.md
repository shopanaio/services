# Color for interfaces

## Contents

- Color as perception
- Dimensions and relationships
- Functional color systems
- Contrast and accessibility
- Themes and adaptation
- Data and status color
- Exercises and rubric
- Sources

## Color as perception

Color is relational. The same physical color can appear different depending on surrounding
value, hue, area, illumination, display, and adaptation. Do not judge a swatch in isolation.

MIT's Art of Color course combines studio studies of interaction, balance, expression, and
warm-cool relationships with the physics and neuroscience of color. Preserve that dual view:
color is both measurable stimulus and situated experience.

## Dimensions and relationships

Use a perceptual vocabulary:

- **Hue**: perceived color family.
- **Lightness/value**: perceived brightness relative to reference.
- **Chroma/saturation**: perceived colorfulness or distance from neutral.
- **Temperature**: contextual warm-cool relation, not an absolute property.
- **Area**: larger areas amplify the apparent presence of a color.
- **Simultaneous contrast**: surrounding colors change apparent hue and value.
- **Successive contrast/adaptation**: prior exposure influences subsequent perception.

Prefer perceptually organized color spaces such as OKLCH for systematic generation, but validate
the final rendered colors and contrast in target browsers and devices. A convenient color space
does not guarantee accessible or harmonious results.

## Functional color systems

Define color by role before value:

- canvas and surfaces;
- primary and secondary text;
- borders and separators;
- interactive accent;
- focus;
- selected and current;
- informational, success, warning, critical;
- data series and categorical distinctions;
- scrims, overlays, and elevation cues.

Separate brand expression from interface semantics. If the brand accent also means "selected,"
"link," and "success," the system becomes ambiguous.

Use tokens that express intent:

```text
color.text.primary
color.action.primary.background
color.status.critical.text
```

Avoid tokens such as `blue500` at the semantic layer. Palette tokens may exist underneath, but
components should bind to roles that can change with theme and context.

## Contrast and accessibility

WCAG contrast is a minimum conformance test, not a complete model of readability.

- Test text and essential graphics against every background they can occupy.
- Do not use color as the only carrier of state or meaning.
- Keep focus indicators perceptible against adjacent colors.
- Test disabled states without making necessary information unreadable.
- Evaluate gradients, images, transparency, materials, hover states, and dark themes at their
  weakest contrast point.
- Consider glare, low-quality displays, brightness settings, color-vision differences, and
  forced-colors modes.

Use the current WCAG 2.2 criteria for conformance. If evaluating APCA, identify it as a different
contrast model and do not substitute experimental thresholds for a required WCAG audit unless
the governing policy permits it.

## Themes and adaptation

Dark mode is not palette inversion.

- Re-establish hierarchy for the new adaptation state.
- Reduce large areas of high-chroma color.
- Tune borders and elevation because shadows behave differently on dark surfaces.
- Preserve semantic identity while changing lightness and chroma.
- Test images, illustrations, charts, syntax, and third-party content.
- Support system preference while permitting a user override when appropriate.

High-contrast and forced-color modes are distinct from dark mode. Do not disable system color
adjustments merely to protect brand appearance.

## Data and status color

- Use categorical palettes for unordered classes and sequential palettes for ordered magnitude.
- Use diverging palettes only when a meaningful midpoint exists.
- Preserve sufficient lightness differences, not only hue differences.
- Label important values directly where possible.
- Keep semantic status colors stable across the product.
- Avoid the rainbow palette for ordered data; its uneven perceptual steps invent boundaries.
- Do not assume red and green carry the same cultural meaning everywhere or are distinguishable
  by everyone.

## Exercises

### Value-first palette

Design a complete interface in grayscale. Establish hierarchy and state. Add hue only where it
improves meaning, navigation, or identity. Document each addition.

### Simultaneous contrast study

Place the same center color on nine backgrounds. Record perceived changes before measuring.
Translate the lesson into a status badge used on multiple surfaces.

### Semantic theme

Create light, dark, and high-contrast mappings for the same semantic tokens. Preserve meaning
without forcing identical numeric relationships.

### Color-independent state

Redesign success, warning, error, selected, and disabled states so each remains understandable
in grayscale and under common color-vision simulations.

## Critique rubric

- Does color encode defined roles rather than arbitrary decoration?
- Is hierarchy still functional without hue?
- Are critical distinctions redundant with text, shape, or position?
- Does every color work across themes, states, and backgrounds?
- Are data palettes appropriate to the data relationship?
- Are cultural meanings and platform conventions considered?
- Has contrast been tested rather than estimated?

## Sources and further study

- [MIT OpenCourseWare: Art of Color](https://ocw.mit.edu/courses/es-298-art-of-color-spring-2005/pages/syllabus/)
- [W3C WCAG 2.2 contrast criteria](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Apple Human Interface Guidelines: Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Material Design 3: Color system](https://m3.material.io/styles/color/overview)
- [IBM Carbon: Accessibility and color](https://carbondesignsystem.com/guidelines/accessibility/color/)
- [CIE — International Commission on Illumination](https://cie.co.at/)
- Josef Albers, *Interaction of Color*.
- Johannes Itten, *The Art of Color*.
- Maureen Stone, *A Field Guide to Digital Color*.
