# Source policy and authority map

## Contents

- Authority tiers
- How to use sources
- Currency and conflict handling
- Core source map
- Citation format

## Authority tiers

Use sources in this order when the claim types overlap.

### Tier 1: normative standards and public institutions

Use for requirements, definitions, and accessibility conformance.

- [W3C Web Content Accessibility Guidelines (WCAG) overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [W3C ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [ISO 9241-210:2019 — Human-centred design for interactive systems](https://www.iso.org/standard/77520.html)
- [US Web Design System](https://designsystem.digital.gov/)
- [GOV.UK Design System](https://design-system.service.gov.uk/)

Normative wording belongs only to the actual standard. W3C explicitly describes APG as
informative rather than normative. Do not present an APG example as the only conforming
implementation.

### Tier 2: universities, peer-reviewed research, and scholarly curricula

Use for foundations, theory, methods, and educational sequence.

- [Carnegie Mellon School of Design BDes learning outcomes](https://www.design.cmu.edu/about-our-programs/undergraduate-degrees/learning-outcomes-bdes-degree-program)
- [CMU Master of Design in Design for Interactions curriculum](https://www.design.cmu.edu/about-our-programs/masters-degrees/master-design-design-interactions)
- [CMU Interaction Design Fundamentals course description](https://metals.hcii.cmu.edu/curriculum/)
- [Rhode Island School of Design Graphic Design BFA](https://www.risd.edu/academics/graphic-design/bachelors-program)
- [Yale Graphic Design program](https://www.art.yale.edu/about/study-areas/graduate-study-areas/graphic-design)
- [Yale Preliminary Studio: Graphic Design](https://www.art.yale.edu/art710a)
- [MIT OpenCourseWare: Art of Color](https://ocw.mit.edu/courses/es-298-art-of-color-spring-2005/pages/syllabus/)
- [MIT OpenCourseWare: User Interface Design and Implementation](https://ocw.mit.edu/courses/6-831-user-interface-design-and-implementation-spring-2011/)
- [UC San Diego Design and Interaction curriculum](https://cogsci.ucsd.edu/undergraduates/major/design-interaction.html)
- [ACM Digital Library](https://dl.acm.org/)

Do not convert a syllabus topic into a scientific fact. Use the syllabus to justify curriculum
coverage and consult original research for empirical claims.

### Tier 3: official platform and mature design-system guidance

Use for platform conventions, implementation-tested patterns, and examples of systemization.

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design 3](https://m3.material.io/)
- [Microsoft Fluent 2](https://fluent2.microsoft.design/)
- [IBM Carbon Design System](https://carbondesignsystem.com/)
- [GOV.UK Service Manual](https://www.gov.uk/service-manual)

These sources express the goals and constraints of their organizations. Extract transferable
reasoning, but do not turn brand-specific values, token scales, or component anatomy into
universal rules.

### Tier 4: established research and professional organizations

Use for synthesized guidance and large observational datasets.

- [Nielsen Norman Group](https://www.nngroup.com/articles/)
- [Baymard Institute research](https://baymard.com/research)
- [Microsoft Inclusive Design](https://inclusive.microsoft.design/)
- [IDEO Design Kit](https://www.designkit.org/)

Record research method, population, product category, and date when using findings. A checkout
finding does not automatically generalize to a clinical workflow or creative tool.

### Tier 5: canonical books and practitioner sources

Use for durable vocabulary, historical context, and craft knowledge. Prefer original authors.
The bibliography records recommended works. Do not reproduce copyrighted chapters or diagrams.

## How to use sources

For each consequential claim:

1. Classify it as normative, empirical, theoretical, platform conventional, or heuristic.
2. Choose the highest appropriate authority tier, not simply the most famous source.
3. State boundary conditions and uncertainty.
4. Link to the source closest to the original claim.
5. Separate source-derived guidance from the designer's contextual inference.

Example:

- Weak: "Users prefer fewer checkout fields."
- Better: "Baymard's ecommerce usability studies repeatedly find unnecessary checkout fields
  increase friction; verify which fields are unnecessary for this market and fulfillment model."

## Currency and conflicts

- Attach version numbers to standards: WCAG 2.2, ISO 9241-210:2019.
- Treat platform guidance as living documentation and recheck it for current work.
- When two systems conflict, identify their different contexts before choosing.
- When a current trend conflicts with accessibility or task clarity, the constraint wins.
- When evidence is weak or unavailable, label the decision a hypothesis and propose a test.

## Citation format

Use inline Markdown links near the claim:

```markdown
WCAG 2.2 defines minimum target-size and focus-visibility criteria
([W3C](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)).
```

For learning modules, finish with a `Sources and further study` section. Use descriptive link
labels rather than raw URLs. Include access dates only when a volatile page or metric matters.
