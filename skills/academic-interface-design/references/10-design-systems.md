# Design systems

## Contents

- System purpose
- Foundations and tokens
- Components and patterns
- Architecture and naming
- Governance
- Documentation and quality
- Adoption and measurement
- Exercises and rubric
- Sources

## System purpose

A design system is a governed set of shared decisions that helps teams produce coherent,
accessible experiences. It is not merely a component library, token file, or visual style guide.

Create a system to solve repeated coordination and quality problems. Do not systematize
differences that are meaningful to distinct products, audiences, or platforms.

Define:

- products and platforms in scope;
- principles and quality bar;
- ownership and decision rights;
- contribution and release model;
- relationship among design, code, content, and accessibility;
- migration and deprecation strategy.

## Foundations and tokens

Foundations include color, type, spacing, layout, shape, elevation, motion, iconography, and
content conventions.

Use token layers:

1. **Primitive**: raw palette or scale values, such as `color.blue.600`.
2. **Semantic**: purpose, such as `color.text.link`.
3. **Component**: intentional local mapping, such as `button.primary.background.rest`.

Do not create a component token for every CSS property. Tokens should encode decisions that need
coordination or theming.

### Token requirements

- type and unit;
- semantic description;
- supported themes and platforms;
- fallback;
- contrast or accessibility relationship;
- lifecycle status;
- source of truth and export path.

Theme mappings preserve meaning, not numeric identity. Platform mappings may legitimately use
different dimensions or behaviors.

## Components and patterns

- A **component** is a reusable UI building block with a semantic and behavioral contract.
- A **pattern** combines components and content to solve a recurring user problem.
- A **template** provides layout structure without determining all content.

Document purpose, anatomy, states, behavior, accessibility, content, localization, responsive
rules, variants, non-use cases, and implementation status.

Avoid:

- one component per visual mockup;
- configuration APIs so broad that no outcome remains coherent;
- variants that encode whole product features;
- visual parity without behavioral parity;
- declaring accessibility "inherited" without testing composition.

## Architecture and naming

Names should express meaning at the right level:

- prefer `feedback.critical` over `red`;
- prefer `space.inline.related` only if the semantic abstraction is actually maintained;
- avoid clever taxonomies the team cannot recall;
- preserve platform-native terminology when interoperability matters.

The system needs explicit extension points. Product teams should be able to compose local
patterns without forking foundations or smuggling one-off values into shared components.

## Governance

Define:

- maintainer responsibilities;
- request and proposal format;
- design and engineering review;
- accessibility acceptance criteria;
- research evidence expected;
- status: experimental, stable, deprecated;
- versioning and migration;
- decision record;
- release communication.

Contribution is a product workflow. If submitting an improvement is harder than bypassing the
system, teams will create local alternatives.

Use federated contribution when domain teams possess specialized knowledge, with central
stewardship for coherence and risk.

## Documentation and quality

Documentation must answer:

- Why and when should this be used?
- When should it not be used?
- What behavior is guaranteed?
- Which content fits?
- How does it adapt?
- What has been accessibility-tested, and how?
- What remains the consuming team's responsibility?

Include realistic examples, edge cases, and paired design/code status. A pristine component
gallery without production content is not sufficient.

Quality gates may include:

- token conformance;
- visual regression;
- keyboard and screen-reader testing;
- zoom and high-contrast testing;
- localization and bidirectionality;
- state matrix coverage;
- API and content review;
- usability evidence for patterns.

## Adoption and measurement

Do not measure only component usage. Track:

- time to produce and change compliant interfaces;
- accessibility defects;
- duplicated local patterns;
- upgrade lag;
- contribution throughput;
- documentation success;
- user-experience consistency where consistency is beneficial;
- exceptions and why they exist.

High adoption can coexist with poor user outcomes. The system supports product design; it does
not replace it.

## Exercises

### Pattern inventory

Audit five product areas. Cluster repeated semantics and behavior, not visual resemblance.
Identify candidates for shared components, patterns, and intentional local variation.

### Token refactor

Convert a raw-value theme into primitive, semantic, and component layers. Demonstrate a dark
theme and high-contrast mapping without renaming roles.

### Contribution simulation

Write a proposal for a new pattern including user problem, evidence, alternatives, accessibility,
API, content, migration, and ownership. Review it as three different product teams.

### Deprecation plan

Replace a widely used but flawed component without breaking product delivery. Include migration,
communications, metrics, and end-of-life criteria.

## Critique rubric

- What coordination problem does the system solve?
- Are tokens semantic, limited, and themeable?
- Do components encode stable meaning and behavior?
- Are patterns backed by real recurring user problems?
- Can product teams extend without forking?
- Are contribution, versioning, and deprecation practical?
- Is accessibility verified at component and composition levels?
- Are adoption metrics connected to quality and user outcomes?

## Sources and further study

- [IBM Carbon Design System](https://carbondesignsystem.com/)
- [Material Design 3](https://m3.material.io/)
- [Microsoft Fluent 2](https://fluent2.microsoft.design/)
- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [US Web Design System](https://designsystem.digital.gov/)
- [W3C Design Tokens Community Group](https://www.w3.org/community/design-tokens/)
- Alla Kholmatova, *Design Systems*.
- Nathan Curtis, *Modular Web Design*.
- Yesenia Perez-Cruz, *Expressive Design Systems*.
