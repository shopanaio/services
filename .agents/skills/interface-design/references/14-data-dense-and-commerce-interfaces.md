# Data-dense, dashboard, and commerce interfaces

## Contents

- Domain evidence
- Dashboards and operational interfaces
- Tables and comparison
- Data visualization
- Ecommerce discovery
- Cart, checkout, and post-purchase
- Exercises and rubric
- Sources

## Domain evidence

Generic design heuristics are insufficient for specialized interfaces. Use domain research,
observe real work, and identify consequence.

Baymard provides large-scale ecommerce usability evidence based on moderated studies,
benchmarking, eye tracking, and quantitative research. Its findings apply most directly to
consumer ecommerce contexts and must be checked against market, product, and fulfillment.

For enterprise tools, study actual roles, frequency, terminology, handoffs, exceptions,
permissions, and cost of error. A visually calm dashboard may still fail experts if it hides
density or slows comparison.

## Dashboards and operational interfaces

Start with decisions:

- What decision or action does each region support?
- What timeframe and comparison baseline matter?
- Is data real-time, delayed, estimated, sampled, or stale?
- Which anomalies require attention?
- What action follows an observation?
- Who is accountable?

Avoid KPI-card collections without a decision model. Give metrics:

- precise name and definition;
- value and unit;
- timeframe;
- comparison;
- status or threshold;
- data freshness;
- drill-down or action;
- uncertainty where applicable.

Use overview, zoom/filter, and details-on-demand as a useful sequence, but preserve essential
context and avoid making every answer require a drill-down.

## Tables and comparison

- Prioritize columns by task, not data-model order.
- Keep row identity stable.
- Align numbers and units.
- Separate primary value from supporting metadata.
- Make sort and filters visible, reversible, and restorable.
- Support bulk selection with explicit scope.
- Preserve column and density preferences for frequent expert work.
- Indicate stale, partial, masked, missing, and unavailable data distinctly.
- Avoid horizontal scroll for simple lists, but use it when preserving true multidimensional
  comparison is better than destroying the table.

Use virtualization and sticky regions carefully; they must not break keyboard, reading order,
find-in-page, or assistive technology.

## Data visualization

Choose chart by relationship and task:

- comparison;
- change over time;
- distribution;
- part-to-whole;
- correlation;
- spatial relationship;
- network;
- flow.

Principles:

- position on a shared scale generally supports precise comparison better than area, angle, or
  color intensity;
- label directly where practical;
- show units, source, timeframe, and uncertainty;
- avoid decorative 3D that distorts quantity;
- use zero baselines when required for honest bar-length comparison;
- preserve meaningful nonzero baselines for some line charts with clear disclosure;
- annotate events and thresholds;
- provide accessible text or tabular alternatives;
- do not use animation to hide a changing scale.

Visualization is an argument about data. Make transformations and omissions inspectable.

## Ecommerce discovery

Support different shopping modes:

- known-item search;
- category exploration;
- compatibility or specification filtering;
- inspiration;
- replenishment;
- comparison.

Design search, categories, filters, product cards, product detail, availability, pricing,
variants, delivery, returns, reviews, and trust as one information system.

- Keep active filters visible and removable.
- Distinguish unavailable combinations from sold-out variants.
- Show total price and recurring obligations clearly.
- Put compatibility and critical constraints near selection.
- Avoid hiding delivery and return information until checkout.
- Preserve product context when returning from detail.

## Cart, checkout, and post-purchase

Baymard's research repeatedly finds avoidable friction in account creation, address forms,
payment, validation, shipping, order review, and recovery.

Transferable principles:

- permit guest checkout where the business allows;
- ask only necessary fields;
- use browser autofill and appropriate input semantics;
- keep labels persistent;
- update totals and shipping changes near their cause;
- preserve entered data through error;
- make final commitment and total explicit;
- prevent duplicate orders;
- provide confirmation, reference, receipt, fulfillment status, and correction/support paths.

Conversion is not the only outcome. Optimize informed choice, trust, accessibility, fulfillment,
returns, support burden, and long-term relationship.

## Exercises

### Decision-first dashboard

Interview a role or use supplied research. List five recurring decisions, then design the
smallest dashboard that supports them. Reject metrics without a decision or action.

### Chart remapping

Represent one dataset with five chart types. Identify which questions each makes easy, hard, or
misleading.

### Table under pressure

Design a table for 10, 1,000, and 1,000,000 records; narrow screen; keyboard use; masked fields;
partial loading; bulk action; and conflicting edits.

### Checkout failure map

Map cart through confirmation with authentication failure, price update, address rejection,
payment decline, network timeout, duplicate submission, and return after interruption.

## Critique rubric

- Is every metric connected to a decision or action?
- Are data definition, timeframe, freshness, and uncertainty visible?
- Does the representation match the comparison task?
- Are dense interfaces optimized for frequency and expertise?
- Are filters, sort, selection, and state restorable?
- Does ecommerce expose price, availability, delivery, and returns before commitment?
- Does checkout minimize entry, preserve data, and support recovery?
- Are accessibility and nonvisual alternatives designed?

## Sources and further study

- [Baymard checkout usability research](https://baymard.com/research/checkout-usability)
- [Baymard ecommerce search research](https://baymard.com/research/ecommerce-search)
- [W3C APG grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [IBM Carbon data table](https://carbondesignsystem.com/components/data-table/usage/)
- [UC San Diego Information Visualization course](https://hci.ucsd.edu/220/)
- Edward Tufte, *The Visual Display of Quantitative Information*.
- Tamara Munzner, *Visualization Analysis and Design*.
- Stephen Few, *Information Dashboard Design*.
- Isabel Meirelles, *Design for Information*.
