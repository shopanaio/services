# Content design and interface language

## Contents

- Content as interface
- Voice, tone, and terminology
- Labels and actions
- Instructions and disclosure
- Errors, empty states, and confirmations
- Localization and accessibility
- Exercises and rubric
- Sources

## Content as interface

Words define concepts, choices, state, consequence, and trust. Content design begins with user
needs and task structure, not polishing copy after the interface is complete.

For each text element know:

- audience and context;
- job it performs;
- source of truth;
- required precision;
- lifecycle and ownership;
- localization and accessibility implications.

Remove text only when meaning remains apparent. Minimal wording that forces guessing is not
simplicity.

## Voice, tone, and terminology

**Voice** is the stable character of an organization or product. **Tone** adapts to context.
A payment failure, celebration, legal consent, and empty canvas should not sound identical.

- Prefer familiar, concrete language.
- Use domain terminology when users know it and precision matters.
- Define unavoidable specialist terms.
- Maintain a terminology system for entities, actions, and statuses.
- Avoid switching synonyms for variety in operational UI.
- Do not anthropomorphize systems in ways that conceal responsibility or capability.

IBM Carbon's content guidance treats clarity, logic, research, and accessible writing as part of
product experience. Its sentence-case convention is a system choice supported by readability and
consistency, not an aesthetic law for every language.

## Labels and actions

- Name controls by the outcome people expect.
- Distinguish navigation from action.
- Use specific verbs: "Archive order" is clearer than "Confirm."
- Name destructive actions and objects.
- Keep paired actions unambiguous: "Discard draft" and "Continue editing."
- Avoid labels whose meaning exists only in nearby explanatory prose.
- Give icon-only controls accessible names and visible labels when recognition is uncertain.

Headings should describe the section's content or decision. Decorative eyebrow labels and
generic headings such as "Overview" consume hierarchy without adding scent.

## Instructions and disclosure

- Put necessary instruction before the action or field.
- Reveal examples in the context where they help.
- Separate requirement from optional advice.
- Disclose cost, consequence, data use, and irreversible effects before commitment.
- Keep help consistent and retrievable.
- Prefer progressive disclosure for secondary detail, not informed consent.

Placeholders disappear and are not a substitute for labels or enduring format guidance.

## Errors, empty states, and confirmations

### Error formula

1. What happened?
2. What is affected?
3. What was preserved?
4. What can the person do next?
5. Where can they get help if recovery fails?

Avoid "Oops," humor, blame, and apology without repair. Preserve diagnostic codes behind a
details path if support needs them.

### Empty states

State the reason: first use, no matching results, permission, synchronization, or true absence.
Offer the relevant next action without inventing a marketing moment.

### Confirmation and success

Confirm the completed outcome and important downstream effects. Provide a durable reference,
receipt, or undo where needed. Do not use a generic toast for high-consequence work that needs
later retrieval.

## Localization and accessibility

- Write source text that can be translated without ambiguity.
- Avoid concatenating sentence fragments.
- Support plural, gender, grammatical case, and variable word order.
- Expect text expansion and different scripts.
- Localize dates, time, numbers, currencies, addresses, and names.
- Do not encode direction with "left" and "right" when layout can be bidirectional.
- Use plain language while preserving necessary legal or technical precision.
- Make link text meaningful out of context.
- Ensure status text is available to assistive technology.

## Exercises

### Verb audit

List every button and link in a flow. Replace vague labels with outcomes, then verify that
neighboring actions remain distinct.

### Error recovery set

Write messages for format error, conflict, permission denial, offline state, partial failure,
and system outage. Give each a different truthful recovery path.

### Terminology map

Inventory nouns and verbs across a product. Resolve synonyms and collisions, recording the user
or domain evidence behind the chosen terms.

### Translation stress

Translate representative UI strings into structurally different languages. Repair layout and
source-copy assumptions without shortening meaning.

## Critique rubric

- Does every text element perform a clear job?
- Are entities and actions named consistently?
- Do labels predict outcome and consequence?
- Is critical instruction placed before the decision?
- Do errors explain impact and recovery?
- Are empty and success states truthful and durable?
- Can the content localize without structural breakage?
- Is tone appropriate to consequence and trust?

## Sources and further study

- [GOV.UK Content Design guidance](https://www.gov.uk/guidance/content-design)
- [GOV.UK Style Guide](https://www.gov.uk/guidance/style-guide)
- [IBM Carbon content overview](https://carbondesignsystem.com/guidelines/content/overview/)
- [IBM Carbon writing style](https://carbondesignsystem.com/guidelines/content/writing-style/)
- [Apple HIG: Writing](https://developer.apple.com/design/human-interface-guidelines/writing)
- [W3C cognitive accessibility guidance](https://www.w3.org/WAI/WCAG2/supplemental/)
- Sarah Richards, *Content Design*.
- Torrey Podmajersky, *Strategic Writing for UX*.
- Kinneret Yifrah, *Microcopy: The Complete Guide*.
