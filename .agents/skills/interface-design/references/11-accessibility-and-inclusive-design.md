# Accessibility and inclusive design

## Contents

- Accessibility as design quality
- Standards model
- Perception
- Operation
- Understanding
- Robustness
- Cognitive and situational inclusion
- Design and testing workflow
- Exercises and rubric
- Sources

## Accessibility as design quality

Accessibility is a continuous design, engineering, content, and testing responsibility. Using an
accessible component library does not make the assembled product accessible. GOV.UK and IBM
explicitly emphasize this distinction.

Design for disability, temporary impairment, situational constraints, aging, language,
technology variation, and different input/output modes. Avoid framing disabled people only as
edge cases or accessibility as a compliance pass.

## Standards model

Use WCAG 2.2 as the primary web conformance reference. Its four principles are:

- **Perceivable**
- **Operable**
- **Understandable**
- **Robust**

For native platforms, combine applicable regulation and standards with platform accessibility
guidance. Use WAI-ARIA only when native HTML semantics cannot express the required widget.

Distinguish:

- normative success criterion;
- informative understanding document;
- sufficient or advisory technique;
- APG pattern;
- platform recommendation;
- organizational policy.

Do not promise legal compliance solely from an interface review.

## Perception

- Provide text alternatives for meaningful non-text content.
- Preserve semantic heading and landmark structure.
- Ensure required text and graphics meet applicable contrast requirements.
- Do not encode meaning by color, sound, position, or shape alone.
- Support zoom, text resizing, reflow, and increased contrast.
- Avoid text embedded in images when real text is possible.
- Caption meaningful audio and describe relevant visual information.
- Preserve information under high contrast and forced colors.

Design annotations should identify reading order, accessible names, descriptions, status
announcements, and nonvisual relationships.

## Operation

- Make every function available by keyboard or an equivalent accessible input.
- Keep focus visible and unobscured.
- Use a logical focus order that follows task and reading structure.
- Avoid keyboard traps.
- Give controls sufficient target size and spacing.
- Provide alternatives to dragging and complex gestures.
- Allow enough time and support extension or saving where possible.
- Avoid flashing and motion that can trigger seizures or vestibular symptoms.
- Provide skip paths and efficient navigation for repeated regions.

Focus, selected, active, checked, current, and hover are different states. Do not merge their
visual or semantic meaning.

## Understanding

- Use clear labels and instructions.
- Keep repeated navigation and help in consistent locations.
- Identify errors specifically and explain repair.
- Avoid redundant re-entry of information already supplied when WCAG criteria apply.
- Support password managers and accessible authentication.
- Make consequences visible before commitment.
- Use plain language without removing necessary domain precision.
- Preserve context across interruptions and errors.

## Robustness

- Prefer semantic HTML and native controls.
- Supply accessible names, roles, values, and state.
- Test dynamic updates with assistive technology.
- Follow documented keyboard conventions for composite widgets.
- Avoid invalid or contradictory ARIA.
- Do not use ARIA to repair an element whose native semantic behavior is available.

W3C APG provides patterns and examples, but it explicitly states that it is not a normative
standard or a production design system.

## Cognitive and situational inclusion

W3C cognitive guidance goes beyond minimum conformance:

- make purpose and next steps clear;
- use familiar hierarchy and controls;
- keep instructions available;
- reduce unnecessary memory;
- prevent and help correct mistakes;
- support interruption and return;
- avoid time pressure;
- allow simplification without hiding consequences.

Inclusive design asks who may be excluded by assumptions about vision, hearing, movement,
speech, cognition, literacy, culture, connectivity, device, or environment.

Do not use personas that turn disability into a checklist. Include disabled people in research
and testing, compensate expertise, and preserve disagreement.

## Design and testing workflow

At concept:

- include accessibility in constraints and recruitment;
- choose semantic patterns;
- map reading and focus order;
- design text scaling and alternate input.

At component:

- specify states, names, roles, keyboard behavior, announcements, and contrast;
- inspect combinations and themes.

At integrated product:

- test keyboard, screen reader, zoom/reflow, high contrast, reduced motion, and realistic tasks;
- include manual testing; automated checks find only a subset of problems.

At release:

- record known limitations;
- provide an accessible support channel;
- treat defects by user consequence, not only criterion count.

## Exercises

### Nonvisual specification

Describe a complex screen's structure, focus order, accessible names, dynamic announcements, and
error recovery without referring to coordinates or color.

### Constraint rotation

Complete a key flow using keyboard only, screen magnification, screen reader, reduced motion,
and voice control. Do not simulate lived experience; use the exercise to find technical barriers.

### Accessible component annotation

Annotate one combobox or grid with semantics, keyboard interaction, focus management, state, and
fallback. Compare against W3C APG.

### Exclusion audit

List every assumed ability, device, environment, language, and level of expertise in a design.
Prioritize exclusions by consequence and frequency evidence.

## Critique rubric

- Which WCAG criteria and platform requirements apply?
- Is information perceivable without a single sensory channel?
- Is every function operable across relevant input methods?
- Are focus, reading order, and dynamic announcements defined?
- Does content help prevent and recover from error?
- Does the design survive zoom, reflow, text scaling, themes, and localization?
- Were disabled people included in research and testing?
- Are conformance, usability, and inclusion reported separately?

## Sources and further study

- [W3C WCAG overview and current publications](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [W3C WCAG 2.2 new criteria](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [W3C ARIA Authoring Practices Guide introduction](https://www.w3.org/WAI/ARIA/apg/about/introduction/)
- [W3C cognitive accessibility](https://www.w3.org/WAI/cognitive/)
- [Microsoft Inclusive Design](https://inclusive.microsoft.design/)
- [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [IBM Carbon: Accessibility](https://carbondesignsystem.com/guidelines/accessibility/overview/)
- [GOV.UK Design System accessibility strategy](https://design-system.service.gov.uk/accessibility/accessibility-strategy/)
- Kat Holmes, *Mismatch: How Inclusion Shapes Design*.
- Regine Gilbert, *Inclusive Design for a Digital World*.
